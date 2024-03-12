const fetchButton = document.getElementById('fetchButton');
const fetchInput = document.getElementById('fetchInput');

var cyFirstRunFlag = false; // cy.run()が1度実行完了したら(相関図が出てる状態になったらtrue)
var cyRunningFlag = false; // cy.run()実行中かのフラグ
var tappingCard = false; // ノードタップ時のフラグ
var resizeEventFlag = false; // リサイズイベントの処理フラグ
var resizeTimer; // リサイズイベントを適切に制御するためのタイマー

// Cytoscape.js
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
      },
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
  
  $('#titleContainer').fadeOut();
  $('#bottom-left').fadeIn('slow');
  fetchData(handle);
});

async function fetchData(handle) {
  try {
    cyRunningFlag = true;

    document.getElementById('loading').style.display = 'block'; // くるくる表示開始
    var elm = cy.$('node, edge');
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
      cyRunningFlag = false;
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
      padding: 10,
      concentric: function(node) {
        return node.data('level');
      },
      levelWidth: function( nodes ){
        return 1;
      },
      stop: function() {
        document.getElementById('loading').style.display = 'none'; // くるくる表示終了
        cyRunningFlag = false; // 描画後にフラグクリアすることで描画瞬間でのキャプチャを防ぐ
      },
    }).run();
    cy.userPanningEnabled(false);
    cy.boxSelectionEnabled(false);
    cyFirstRunFlag = true;
    
    window.setTimeout(() => {  // cy.run()と同時に表示させるとfadeInが効かないので時間差をつける
      $('#shareButton').fadeIn();
    }, 1000);

  } catch (error) {
    console.error('Error fetching data:', error);
    showAlert("ブラウザでエラーが発生しました");
  }
}

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

async function shareGraph() {
  if (!cyRunningFlag) {
    // bg
    var randomColor = generateRandomColor();

    var blob = await cy.png({
      output: "blob",
      bg: randomColor,
      full: true,
    });

    // サーバにblobを投げ合成してもらい、base64uriを受け取る
    var formData = new FormData();
    formData.append('image', blob);
    var response = await fetch('/upload', {
        method: 'POST',
        body: formData,
    });
    var json = await response.json();

    // Set image source
    document.getElementById('popupImageShare').src = json.uri;

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

$(document).ready(() => {
  // どこかをクリックしたときの処理
  cy.on('tap', (evt) => {
    // console.log("tap")
    if ($('#alert').is(':visible')) {
    // アラートを非表示にする
      hideAlert();
    }
  });
  
  // カード表示
  cy.on('tap', 'node', function(evt){
    var node = evt.target;
    var handle = node.data('handle');

    $('#cardTitle').text(node.data('name'));
    $('#cardSubtitle').text("@"+handle);
    $('#cardLink').attr('href', "https://bsky.app/profile/" + handle);
    
    // // フォローバッジ変更
    // $('#card-badge').removeClass('bg-success');
    // $('#card-badge').removeClass('bg-danger');
    // if (node.data('level') == 5) {
    //   // 中心ノードなら
    //   $('#card-badge').text("");
    // } else if (JSON.parse(node.data('followed'))) {
    //   $('#card-badge').text("Followed");
    //   $('#card-badge').addClass('bg-success');
    // } else {
    //   $('#card-badge').text("Not Followed");
    //   $('#card-badge').addClass('bg-danger');
    // };

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

  // カード消す
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

  // パーティクル
  cy.on('tap', 'node', function(event){
    var node = event.target;
    var position = node.renderedPosition(); // タップされたノードのcytoscape.jsの座標系での位置を取得
    var engagement = node.data('engagement');

    // タップ時にp5.js側のキャンバスをリサイズ
    // updateParticlePositions(position);
    resizeCanvas(windowWidth, windowHeight);
    
    // Create particles
    emitParticlesFromNode(position, engagement); // パーティクルを発生させる
  });

  // ウィンドウのリサイズイベントを検知して、グラフをフィットさせる
  cy.on('resize', function() {
    if (!resizeEventFlag) {
      clearTimeout(resizeTimer); // タイマーをクリアして連続しての実行を防ぐ
      resizeTimer = setTimeout(function() {
        cy.resize(); // 描画領域のサイズをウィンドウのサイズに合わせる
        cy.fit('node, edge', 10); // グラフをフィットさせる

        // パーティクルの位置を更新
        // updateParticlePositions(centerNodePosition);

        resizeEventFlag = false;
      }, 200); // イベントが一定時間後に発火するように遅延を設定する
      resizeEventFlag = true; // フラグをセット
    };
  });
});
