const fetchButton = document.getElementById('fetchButton');
const fetchInput = document.getElementById('fetchInput');

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
  fetchData();
});

async function fetchData(handle) {
  try {
    console.log(handle)
    if (!handle) {
      handle = fetchInput.value.trim();
    }
    document.getElementById('loading').style.display = 'block'; // くるくる表示開始
    var elm = cy.$('cy');
    cy.remove(elm);
    const response = await fetch(`/generate?handle=${handle}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
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

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

cy.on('tap', 'node', function(evt){
  var node = evt.target;
  var name = node.data("name");
  var handle = node.data("handle");
  var href = "https://bsky.app/profile/" + handle;
  // console.log(handle);

  // ツールチップの位置を設定
  var tooltip = document.getElementById('nodeTooltip');
  tooltip.style.top = node.position().y + 10 + 'px'; // パンとズームに追従
  tooltip.style.left = node.position().x + 10 + 'px'; // パンとズームに追従

  // ツールチップのコンテンツを設定
  document.getElementById('tooltipContent').innerHTML = `
    <p style="margin-bottom"><strong>${name}</strong></p>
    <p style="margin-bottom"><a href="${href}" target=”_blank”>@${handle}</a></p>
  `;

  // ツールチップを表示
  tooltip.style.display = 'block';

  // 「再生成」ボタンのクリックイベントを設定
  document.getElementById('regenerateButton').onclick = function() {
    // console.log(handle);
    fetchData(handle);
    tooltip.style.display = 'none';
  };
});

async function shareGraph() {
    // var text = "\n#ひろがるBluesky";
    var base64uri = await cy.png({
        output: "base64uri",
        bg: "skyblue",
        full: true,
    });

    // Set image source
    document.getElementById('popupImageShare').src = base64uri;

    // Show Bootstrap modal
    $('#shareModal').modal('show');
    
    // サーバにblobを投げ、返ってきたuriをintentに投げる(未実装API)
    // var formData = new FormData();
    // formData.append('image', blob);
    // var response = await fetch('/upload', {
    //     method: 'POST',
    //     body: formData,
    // });
    // var json = await response.json();
    // var imageUris = json.uri.ref.$link;
    // console.log(imageUris);

    // var url = "https://bsky.app/intent/compose?text=" +
    //           encodeURIComponent(text) + 
    //           "&imageUris=" + 
    //           encodeURIComponent("at://suibari-cha.bsky.social/") + 
    //           encodeURIComponent("app.bsky.embed.images/") +
    //           encodeURIComponent(imageUris);
    // console.log(url);
    // window.open(url);
}

// ズームやパンの変更時にもツールチップの位置を更新
// パンとズームにツールチップを追従させる
cy.on('pan zoom', function(evt) {
    var nodes = cy.nodes();
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var tooltip = document.getElementById('nodeTooltip');
        var position = node.renderedPosition(); // レンダリング位置を取得
        if (tooltip.style.display === 'block') {
            // パンとズームを考慮して位置を設定
            var x = position.x * cy.zoom() + cy.pan().x;
            var y = position.y * cy.zoom() + cy.pan().y;
            tooltip.style.top = y + 10 + 'px'; 
            tooltip.style.left = x + 10 + 'px';
        }
    }
});