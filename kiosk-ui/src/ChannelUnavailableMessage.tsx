import "./ChannelUnavailableMessage.css";

function ChannelUnavailableMessage() {
  return (<div class="channel-unavailable-message">
    <img src="images/optimum logo.png" width="200" />
    This channel is not available
    <span style="font-size: 2rem; margin-top: 1rem;">
      Please select another channel or check back later.
    </span>
  </div>);
}

export default ChannelUnavailableMessage;
