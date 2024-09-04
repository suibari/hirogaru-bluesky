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
  import { createEventDispatcher, onMount } from 'svelte';
  import IconButton from "@smui/icon-button";
  const dispatch = createEventDispatcher();

  export let tappedNode;
  export let handleSubmit;
  export let isGridMode;

  onMount(() => {
    function handleClickSocialAnalysis() {
    console.log("clicked social analysis");
    dispatch('doSocialAnalysis');
    }
  })
</script>

<!-- {#if tappedNode} -->
<div class="card-container">
  <Card>
    <PrimaryAction on:click={window.open(`https://bsky.app/profile/${tappedNode.data('handle')}`, "_blank")}>
      <Media class="card-media" aspectRatio="square" style="background-image: {tappedNode.data('img')}">
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
    {#if tappedNode.data('level') !== 0}
      <div id="replylike">
        <div class="icon">
          <IconButton class="material-icons">reply</IconButton>
        </div>
        <h4>
          {tappedNode.data('reply') || "-"}
        </h4>
        <div class="icon">
          <IconButton class="material-icons">favorite</IconButton>
        </div>
        <h4>
          {tappedNode.data('like') || "-"}
        </h4>
      </div>
    {/if}
    <Actions>
      <ActionButtons style="width: 100%;">
        {#if isGridMode}
          <Button variant="raised">
            <Label on:click={() => dispatch('backConcentric', tappedNode.data('handle'))}>相関図にもどる</Label>
          </Button>
        {:else if tappedNode.data('level') === 0}
          <Button variant="raised" color="secondary" disabled style="width: 100%">
            <Label on:click={handleSubmit(tappedNode.data('handle'))}>相関図をつくる</Label>
          </Button>
          <!-- <Button variant="raised" color="secondary" disabled>
            <Label on:click={() => {dispatch('doSocialAnalysis');}}>関係分析</Label>
          </Button> -->
        {:else}
          <Button variant="raised" style="width: 100%">
            <Label on:click={handleSubmit(tappedNode.data('handle'))}>相関図をつくる</Label>
          </Button>
          <!-- <Button variant="raised">
            <Label on:click={() => {dispatch('doSocialAnalysis');}}>関係分析</Label>
          </Button> -->
        {/if}
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
    width: 230px;
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
  #replylike {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon {
    font-size: 24px;
    flex-shrink: 0;
    color: #333;
    margin-left: 10px;
    pointer-events: none;
  }
  #replylike h4 {
    margin: 0;
    flex-shrink: 0;
    margin-right: 20px;
  }
</style>