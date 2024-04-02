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
        <div class="cardtext-container">
          <h3 class="cardtext">
            {tappedNode.data('name')}
          </h3>
          <h6 class="cardtext">
            {tappedNode.data('handle')}
          </h6>
        </div>
      </Media>
    </PrimaryAction>
    <Actions>
      <ActionButtons>
        {#if isGridMode}
          <Button variant="raised">
            <Label on:click={() => dispatch('backConcentric', tappedNode.data('handle'))}>相関図にもどる</Label>
          </Button>
        {:else if tappedNode.data('level') === 5}
          <Button variant="raised" color="secondary" disabled>
            <Label on:click={handleSubmit(tappedNode.data('handle'))}>相関図をつくる</Label>
          </Button>
          <Button variant="raised" color="secondary" disabled>
            <Label on:click={() => {dispatch('doSocialAnalysis');}}>関係分析</Label>
          </Button>
        {:else}
          <Button variant="raised">
            <Label on:click={handleSubmit(tappedNode.data('handle'))}>相関図をつくる</Label>
          </Button>
          <Button variant="raised">
            <Label on:click={() => {dispatch('doSocialAnalysis');}}>関係分析</Label>
          </Button>
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
  .cardtext-container {
    position: absolute;
    width: 100%;
    bottom: 8px;
    left: 16px;
    color: white;
    mix-blend-mode: difference;
  }
  .cardtext {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>