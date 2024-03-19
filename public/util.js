// アラートが表示されるときの処理
function showAlert(text, handle) {
  if (handle) {
    // console.log("detect")
    $('#alert').html(text + ` <a id="handleLink" class="link-underline-primary" style="cursor: pointer;">${handle}</a> ？`);
    $('#alert').fadeIn();
    $('#handleLink').one('click', function() {
      hideAlert();
      generateGraph(handle);
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
