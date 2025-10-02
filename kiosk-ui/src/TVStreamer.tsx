import NotAuthorized from './NotAuthorized';

const TVStreamer = () => {
    return (
        <div class="television" style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'black', display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}>
            {/* <img
            src="./images/patrick.jpg"
            style={{
                'max-width': '100%',
                'max-height': '100%',
                'object-fit': 'contain',
                display: 'block',
                margin: 'auto'
            }}
            /> */}
            <NotAuthorized />
        </div>
    );
}

export default TVStreamer;