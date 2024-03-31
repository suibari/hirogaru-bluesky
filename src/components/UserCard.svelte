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
      <Media class="card-media" aspectRatio="square" style="background-image: {tappedNode.data('img')}" />
      <Content>
        <h3 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          {tappedNode.data('name')}
        </h3>
        <h6 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          {tappedNode.data('handle')}
        </h6>
      </Content>
    </PrimaryAction>
    <Actions>
      <ActionButtons>
        <Button variant="raised">
          <Label on:click={handleSubmit(tappedNode.data('handle'))}>相関図をつくる</Label>
        </Button>
        <Button variant="raised">
          <Label on:click={() => {dispatch('doSocialAnalysis');}}>関係分析</Label>
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
    width: 230px;
    z-index: 1;
  }
</style>