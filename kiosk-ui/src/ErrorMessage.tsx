import "./ErrorMessage.css";

function ErrorMessage() {
    return (
        <div class="dialog">
            <div class="header">
                {/* Not Authorized */}
                Error
            </div>
            <div class="message">
                An error has occurred.<br />
                Please refresh the page.
                {/* To order CANS service<br />
                on this channel,<br />
                please call (866)483-4448. */}
            </div>
        </div>
    )
}

export default ErrorMessage;