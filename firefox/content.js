/*
 * TODO: Name
 * Copyright (c) 2022 Marvin Krebber
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the  GNU General Public License v3.0.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License v3.0 for more details.
 */
let url = window.location.href;
const isShort = /shorts/i.test(url);
const version = "1.0.0";
// global variables in localStorage
const defaultSettings = {
  settings: {
    skip: true,
  },
};
let settings = defaultSettings.settings;

browser.storage.sync.get("settings", function (result) {
  settings = result.settings;
  console.log("Youtube Enhancer");
  console.log("version: ", version);
  console.log("Settings", settings);
  if (typeof settings !== "object") {
    browser.storage.sync.set(defaultSettings);
  } else {
    // if there is an undefined setting, set it to the default
    let changedSettings = false;
    for (const key in defaultSettings.settings) {
      if (typeof settings[key] === "undefined") {
        console.log("undefined Setting:", key);
        changedSettings = true;
        settings[key] = defaultSettings.settings[key];
      } else {
        for (const subkey in defaultSettings.settings[key]) {
          if (typeof settings[key][subkey] === "undefined") {
            console.log("undefined Setting:", key, subkey);
            changedSettings = true;
            settings[key][subkey] = defaultSettings.settings[key][subkey];
          }
        }
      }
    }
    if (changedSettings) {
      browser.storage.sync.set({ settings });
    }
  }
});
browser.storage.sync.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    if (key == "settings") {
      settings = newValue;
      console.log(key, "Old value:", oldValue, ", new value:", newValue);
      // if value is changed then check if it is enabled or disabled
      if (oldValue === undefined || newValue.skip !== oldValue.skip) console.log("skip changed");
    }
  }
});

if (isShort) {
  let video = document.querySelector("video");
  console.log("video", video);
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      onUrlChange();
    }
  }).observe(document, { subtree: true, childList: true });

  function onUrlChange() {
    console.log("URL changed!", location.href);
  }
  // wait until video is finished
  video.addEventListener("ended", () => {
    console.log("Video ended");
    // // skip to next video
    // if (settings.skip) {
    //   console.log("Skip to next video");
    //   document.querySelector("button.ytp-next-button").click();
    // }
  });
} else {
  let video = document.querySelector("video");
  console.log("video", video);
  console.log("not a short");
  // wait until video is finished
  video.addEventListener("ended", () => {
    console.log("Video ended");
    // skip to next video
    // if (settings.skip) {
    console.log("Skip to next video");
    document.querySelector("a.ytp-autonav-endscreen-upnext-button").click();
    // }
  });
}
