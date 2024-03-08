const fetchButton = document.getElementById('fetchButton');
const fetchInput = document.getElementById('fetchInput');

var cyrunflag = false;

var cy = cytoscape({
    container: document.getElementById('cy'), // container to render in

    elements: [],

    style: [
        {
            selector: 'node',
            style: {
                'width': 'data(rank)',
                'height': 'data(rank)',
                'background-fit': 'contain',
                'background-image': 'data(img)',
                // 'background-image': async (ele) => {    
                //     var base64uri = ele.data('img');
                //     return "url(image/" + base64uri + ")";
                // },
                // 'background-image-crossorigin': "null",
            },
        },
        {
            selector: 'edge',
            style: {
                'width': 3,
                'display': 'none',
            }
        }
    ]
});

// Enterキーが押されたときにfetch処理を実行
fetchInput.addEventListener('keyup', function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        fetchButton.click();
    }
});

fetchButton.addEventListener('click', (event) => {
  handle = fetchInput.value.trim();
  
  // エラー検査
  if (!handle) {
    showAlert("テキストが入力されていません");
    return;
  } else if (!/\./.test(handle)) {
    showAlert("有効なhandleではありません。もしかして", handle);
    return;
  }
  
  fetchData(handle);
});

async function fetchData(handle) {
  try {
    document.getElementById('loading').style.display = 'block'; // くるくる表示開始
    var elm = cy.$('cy');
    cy.remove(elm);
    handle = encodeURIComponent(handle);
    const response = await fetch(`/generate?handle=${handle}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // エラー処理
    if (!response.ok) {
      const errorData = await response.json();
      showAlert("サーバでエラーが発生しました: " + errorData.message);
      document.getElementById('loading').style.display = 'none'; // くるくる表示終了
      cyrunflag = false;
      return;
    }

    const data = await response.json();
    // console.log(data);
    cy.add(data);
    cy.layout({
      // cose ---
      // name: 'cose',
      // animate: false,
      // nodeOverlap: 1,
      // nodeRepulsion: function( node ){ return 1e7; },
      // cola ---
      // name: 'cola',
      // animate: false,
      // concentric ---
      name: 'concentric',
      animate: true,
      concentric: function(node) {
        return node.data('level');
      },
      levelWidth: function( nodes ){
        return 1;
      },
      stop: function() {
        document.getElementById('loading').style.display = 'none'; // くるくる表示終了
      },
    }).run();
    cyrunflag = true;
    window.setTimeout(() => {  // cy.run()と同時に表示させるとfadeInが効かないので時間差をつける
      $('#shareButton').fadeIn();
    }, 1000);

  } catch (error) {
    console.error('Error fetching data:', error);
    showAlert("ブラウザでエラーが発生しました");
  }
}

// どこかをクリックしたときの処理
cy.on('tap', (evt) => {
  // console.log("tap")
  if ($('#alert').is(':visible')) {
  // アラートを非表示にする
    hideAlert();
  }
})

// アラートが表示されるときの処理
function showAlert(text, handle) {
  if (handle) {
    // console.log("detect")
    $('#alert').html(text + ` <a id="handleLink" class="link-underline-primary" style="cursor: pointer;">${handle}.bsky.social</a> ？`);
    $('#alert').fadeIn();
    $('#handleLink').one('click', function() {
      hideAlert();
      fetchData(handle + ".bsky.social");
    });
  } else {
    $('#alert').text(text);
    $('#alert').fadeIn();
  };
}

// アラートを非表示にする処理
function hideAlert() {
  $('#alert').fadeOut();
}

var tappingCard = false; // ノードタップ時のフラグ

cy.on('tap', 'node', function(evt){
  var node = evt.target;
  var handle = node.data('handle');

  $('#cardTitle').text(node.data('name'));
  $('#cardSubtitle').text("@"+handle);
  $('#cardLink').attr('href', "https://bsky.app/profile/" + handle);

  if (!$('#card').is(':visible') || $('#card').data('nodeId') !== node.id()) {
    $('#card').data('nodeId', node.id());
    $('#card').fadeIn();
    tappingCard = true;
  }

  $('#regenerateButton').off('click').click(function(evt) {
    evt.stopPropagation();
    fetchData(handle);
    $('#card').fadeOut();
    tappingCard = false;
  });
});

cy.on('tap', (evt) => {
  if ($('#card').is(':visible') && !$(evt.target).closest('#card').length && !tappingCard) {
    $('#card').fadeOut();
  }
  tappingCard = false;
})

// // カード以外の領域をクリックしたときの処理
// $(document).on('click', function(e) {
//   if (!$(e.target).closest('#card').length && ($('#card').is(':visible'))) {
//     // カードが表示されている場合のみ非表示にする
//     $('#card').fadeOut();
//   }
// });

async function shareGraph() {
  if (cyrunflag) {
    // bg
    var randomColor = generateRandomColor();

    var base64uri = await cy.png({
      output: "base64uri",
      bg: randomColor,
      full: true,
    });

    // Set image source
    document.getElementById('popupImageShare').src = base64uri;

    // Show Bootstrap modal
    $('#shareModal').modal('show');
  } else {
    showAlert("相関図を生成後、画像シェアができます");
  }
}

// ランダムな背景色を生成する関数
function generateRandomColor() {
  var hue = Math.floor(Math.random() * 360); // 色相をランダムに選択（0から359）
  var saturation = Math.floor(Math.random() * 31) + 60; // 彩度を60から90の間でランダムに選択
  var lightness = Math.floor(Math.random() * 21) + 60; // 明度を40から80の間でランダムに選択
  return 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)'; // HSLカラーモデルで色を返す
}

// ズームやパンの変更時にもツールチップの位置を更新
// パンとズームにツールチップを追従させる
// cy.on('pan zoom', function(evt) {
//     var nodes = cy.nodes();
//     for (var i = 0; i < nodes.length; i++) {
//         var node = nodes[i];
//         var tooltip = document.getElementById('nodeTooltip');
//         var position = node.renderedPosition(); // レンダリング位置を取得
//         if (tooltip.style.display === 'block') {
//             // パンとズームを考慮して位置を設定
//             var x = position.x * cy.zoom() + cy.pan().x;
//             var y = position.y * cy.zoom() + cy.pan().y;
//             tooltip.style.top = y + 10 + 'px'; 
//             tooltip.style.left = x + 10 + 'px';
//         }
//     }
// });