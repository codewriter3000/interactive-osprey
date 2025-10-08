import Hls from "hls.js";

export class ProxyLoader extends Hls.DefaultConfig.loader {
  constructor(config) {
    super(config);
    // @ts-ignore
    this.load = (context, config, callbacks) => {
      const { url } = context;
      const proxied = `/proxy?u=${encodeURIComponent(url)}`;
      // @ts-ignore use base XHR/Fetch loader underneath
      return super.load({ ...context, url: proxied }, config, callbacks);
    };
  }
}