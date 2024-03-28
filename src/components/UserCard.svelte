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
      <Media class="card-media" aspectRatio="square" style="background-image: {tappedNode.data('img')}">
        <MediaContent>
          <div
            style="color: #fff; position: absolute; bottom: 16px; left: 16px;"
          >
            <h2 class="mdc-typography--headline6" style="margin: 0;">
              {tappedNode.data('name')}
            </h2>
            <h3 class="mdc-typography--subtitle2" style="margin: 0;">
              {tappedNode.data('handle')}
            </h3>
          </div>
        </MediaContent>
      </Media>
    </PrimaryAction>
    <Actions>
      <ActionButtons>
        <Button>
          <Label on:click={handleSubmit(tappedNode.data('handle'))}>相関図をつくる</Label>
        </Button>
        <Button>
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
    z-index: 1;
  }
</style>