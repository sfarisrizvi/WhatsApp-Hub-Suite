declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

let sdkLoaded = false;
let sdkLoading = false;
let loadCallbacks: Array<() => void> = [];

export function loadFacebookSDK(appId: string): Promise<void> {
  return new Promise((resolve) => {
    if (sdkLoaded && window.FB) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (sdkLoading) return;
    sdkLoading = true;

    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
      sdkLoaded = true;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks = [];
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });
}

export interface EmbeddedSignupResult {
  code: string;
  phoneNumberId?: string;
  wabaId?: string;
}

export function launchWhatsAppSignup(configId: string): Promise<EmbeddedSignupResult> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK not loaded"));
      return;
    }

    let sessionData: { phoneNumberId?: string; wabaId?: string } = {};

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.data?.phone_number_id) {
            sessionData.phoneNumberId = data.data.phone_number_id;
          }
          if (data.data?.waba_id) {
            sessionData.wabaId = data.data.waba_id;
          }
        }
      } catch {}
    };

    window.addEventListener("message", messageHandler);

    window.FB.login(
      (response: any) => {
        window.removeEventListener("message", messageHandler);

        if (response.authResponse) {
          const code = response.authResponse.code;
          resolve({
            code,
            phoneNumberId: sessionData.phoneNumberId,
            wabaId: sessionData.wabaId,
          });
        } else {
          reject(new Error("Login cancelled or not fully authorized"));
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    );
  });
}
