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
  import ActiveHistgram from './ActiveHistgram.svelte';
  const dispatch = createEventDispatcher();

  export let tappedNode;
  export let handleSubmit;
  let lastActionTimeText = '';
  let timeOnBskyText = '';

  onMount(() => {
    function handleClickSocialAnalysis() {
    console.log("clicked social analysis");
    dispatch('doSocialAnalysis');
    }
  })

  function getLastActionText(lastActionTime) {
    const now = new Date();
    const actionTime = new Date(lastActionTime);
    const diffInMilliseconds = now - actionTime;
    const diffInMinutes = Math.floor(diffInMilliseconds / 60000);
    const diffInHours = Math.floor(diffInMilliseconds / (60000 * 60));
    const diffInDays = Math.floor(diffInMilliseconds / (60000 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30); // おおよそ1ヶ月を30日とする

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays < 30) {
      return `${diffInDays}d`;
    } else {
      return `${diffInMonths}M`;
    }
  }

  $: {
    if (tappedNode && tappedNode.data('lastActionTime')) {
      lastActionTimeText = getLastActionText(tappedNode.data('lastActionTime'));
    }
  }

  function calculateDaysSince(utcString) {
    const pastDate = new Date(utcString);
    
    const currentDate = new Date();
    const diffInMilliseconds = currentDate - pastDate;
    const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
  
    return diffInDays;
  }

  $: {
    if (tappedNode && tappedNode.data('createdAt')) {
      timeOnBskyText = calculateDaysSince(tappedNode.data('createdAt'));
    }
  }

</script>

<!-- {#if tappedNode} -->
<div class="card-container">
  <Card>
    <div class="avatar">
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
    </div>
    <div id="cardinfo-container">
      <div style="display: flex; justify-content: center;">
        {#if tappedNode.data('lastActionTime')}
          <div class="last-action-time" style="display: flex; align-items:flex-end; justify-content: center; margin: 5px 10px; gap: 5px;">
            <h6 class="full">Last<br>Active:</h6>
            <h6 class="short">Last:</h6>
            <h4>{lastActionTimeText}</h4>
          </div>
        {/if}
        {#if tappedNode.data('createdAt')}
          <div class="time-on-bsky" style="display: flex; align-items:flex-end; justify-content: center; margin: 5px 10px; gap: 5px;">
            <h6 class="full">Days on<br>Bluesky:</h6>
            <h6 class="short">Days:</h6>
            <h4>{timeOnBskyText}</h4>
          </div>
        {/if}
      </div>
      {#if tappedNode.data('wordFreqMap')}
        <h6 class="word-freq-map" style="margin-left: 10px;">Favorite words:</h6>
        <div style="display: flex; justify-content: center; gap: 10px;">
          <h5>#{tappedNode.data('wordFreqMap')[0]}</h5>
          <h5>#{tappedNode.data('wordFreqMap')[1]}</h5>
          <h5>#{tappedNode.data('wordFreqMap')[2]}</h5>
        </div>
      {/if}
      {#if tappedNode.data('activeHistgram')}
        <ActiveHistgram {tappedNode}/>
      {/if}
      {#if tappedNode.data('level') !== 0}
        <div id="replylike">
          <h6>To you:</h6>
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
  .last-action-time h6.short {
    display: none;
  }
  .time-on-bsky h6.short {
    display: none;
  }
  @media screen and (max-width: 600px) {
    .card-container {
      width: 200px;
    }

    .last-action-time h6.full {
      display: none;
    }
    .last-action-time h6.short {
      display: inline;
    }

    .time-on-bsky h6.full {
      display: none;
    }
    .time-on-bsky h6.short {
      display: inline;
    }

    .word-freq-map {
      display: none;
    }

    #replylike h6 {
      display: none;
    }
  }
</style>