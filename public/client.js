const fetchButton = document.getElementById('fetchButton');
const fetchInput = document.getElementById('fetchInput');

var cyrunflag = false; // cy.run()実行中かのフラグ
var tappingCard = false; // ノードタップ時のフラグ

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
  } else if (!/\./.test(handle) && /@/.test(handle)) {
    handle = handle.replace("@", "") + ".bsky.social";
    showAlert("有効なhandleではありません。もしかして", handle);
    return;
  } else if (!/\./.test(handle)) {
    showAlert("有効なhandleではありません。もしかして", handle+".bsky.social");
    return;
  } else if (/@/.test(handle)) {
    handle = handle.replace("@", "");
    showAlert("有効なhandleではありません。もしかして", handle);
    return;
  }
  
  fetchData(handle);
});

async function fetchData(handle) {
  try {
    cyrunflag = true;

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
    cyrunflag = false;
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
    $('#alert').html(text + ` <a id="handleLink" class="link-underline-primary" style="cursor: pointer;">${handle}</a> ？`);
    $('#alert').fadeIn();
    $('#handleLink').one('click', function() {
      hideAlert();
      fetchData(handle);
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

// カード表示
cy.on('tap', 'node', function(evt){
  var node = evt.target;
  var handle = node.data('handle');

  $('#cardTitle').text(node.data('name'));
  $('#cardSubtitle').text("@"+handle);
  $('#cardLink').attr('href', "https://bsky.app/profile/" + handle);
  
  // フォローバッジ変更
  $('#card-badge').removeClass('bg-success');
  $('#card-badge').removeClass('bg-danger');
  if (node.data('level') == 5) {
    // 中心ノードなら
    $('#card-badge').text("");
  } else if (JSON.parse(node.data('followed'))) {
    $('#card-badge').text("Followed");
    $('#card-badge').addClass('bg-success');
  } else {
    $('#card-badge').text("Not Followed");
    $('#card-badge').addClass('bg-danger');
  };

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

// ノードマウスオーバーで半透明
cy.on('mouseover', 'node', function(event){
  var node = event.target;
  node.style('opacity', '0.5');
});
cy.on('mouseout', 'node', function(event){
  var node = event.target;
  node.style('opacity', '1');
});

async function shareGraph() {
  if (!cyrunflag) {
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

// テキストボックスオートフォーカス
window.onload = function() {
  fetchInput.focus();
};