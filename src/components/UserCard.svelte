<script>
  import Card, {
    Content,
    PrimaryAction,
    Media,
    MediaContent,
    Actions,
    ActionButtons,
    ActionIcons,
  } from '@smui/card';
  import Button, { Label } from '@smui/button';
  import IconButton from "@smui/icon-button";

  export let tappedNode;
  export let handleSubmit;
</script>

<!-- {#if tappedNode} -->
<div class="card-container">
  <Card>
    <div class="avatar">
      <PrimaryAction on:click={window.open(`https://bsky.app/profile/${tappedNode.data('handle')}`, "_blank")}>
        <Media class="card-media" aspectRatio="16x9" style="background-image: {tappedNode.data('img')}">
          <div class="cardtext-bg">
            <div class="cardtext-container">
              <h3 class="cardtext">
                {tappedNode.data('name')}
              </h3>
              <h6 class="cardtext">
                {tappedNode.data('handle')}
              </h6>
            </div>
          </div>
        </Media>
      </PrimaryAction>
    </div>
    <div id="cardinfo-container">
      <p style="text-align: center; margin-top: 5px; margin-bottom: 0px;">ポスト分析は<a href="https://blu-lyzer.vercel.app/" target="_blank">Blu-lyzer</a>で!</p>
      {#if tappedNode.data('level') !== 0}
        <div id="replylike">
          <h6>From you:</h6>
          <div class="icon">
            <IconButton class="material-icons">reply</IconButton>
          </div>
          <h4>
            {tappedNode.data('replyFromCenter') || "-"}
          </h4>
          <div class="icon">
            <IconButton class="material-icons">favorite</IconButton>
          </div>
          <h4>
            {tappedNode.data('likeFromCenter') || "-"}
          </h4>
        </div>
      {/if}
    </div>
    <Actions>
      <ActionButtons style="width: 100%;">
        <Button variant="raised" style="width: 100%">
          <Label on:click={handleSubmit(tappedNode.data('handle'))}>相関図をつくる</Label>
        </Button>
      </ActionButtons>
    </Actions>
  </Card>
</div>
<!-- {/if} -->

<style>
  .card-container {
    position: fixed;
    bottom: 10px;
    left: 10px;
    width: 300px;
    z-index: 1;
  }
  .cardtext-bg {
    position: absolute;
    bottom: 0;
    height: 50%;
    width: 100%;
    background: linear-gradient(to top, white, transparent);
    display: flex;
    align-items: flex-end;
  }
  .cardtext-container {
    width: 100%;
    padding-left: 12px;
    color: #333;
  }
  .cardtext {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  #cardinfo-container {
    position: relative;
    width: 100%;
  }
  #replylike {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon {
    font-size: 24px;
    flex-shrink: 0;
    color: #333;
    pointer-events: none;
  }
  #replylike h4 {
    margin: 0;
    flex-shrink: 0;
    margin-right: 20px;
  }
  @media screen and (max-width: 600px) {
    .card-container {
      width: 200px;
    }

    #replylike h6 {
      display: none;
    }
  }
</style>