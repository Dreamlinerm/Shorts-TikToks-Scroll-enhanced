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
const version = "1.0.6";
// global variables in localStorage
const defaultSettings = {
  settings: {
    TikTok: { autoScroll: true, speedSlider: true },
    Statistics: {},
    General: { sliderSteps: 1, sliderMin: 5, sliderMax: 20 },
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
  console.log("is short");
  let videoId = 0;
  function getUnicodeNumber(numb) {
    let numberArray = numb.toString().split("");
    let result = "";
    // foreach number in numberArray add unicode number
    numberArray.forEach((number) => {
      result += `\\${parseInt(number) + 30}`;
    });
    return result;
  }
  // console.log(getUnicodeNumber(100));
  let video = document.querySelector("video");
  // do two times otherwise it wont remove loop correctly
  const config = { subtree: true, childList: true, attributeFilter: ["video"] };
  let videoLoopDeactivated = false;
  let doOnce = true;
  let videoObserver = new MutationObserver((mutations) => {
    video = document.querySelector("video");
    // console.log("video", video, video.loop);
    if (video.loop) {
      // remove attribute loop from video
      video.removeAttribute("loop");
      console.log("removed loop", videoId);
      videoLoopDeactivated = true;
    } else if (videoLoopDeactivated) {
      videoObserver.disconnect();
    }
    if (videoLoopDeactivated && doOnce) {
      doOnce = false;
      addListener();
    }
  });
  videoObserver.observe(document, config);
  function addListener() {
    // wait until video is finished
    video.addEventListener("ended", () => {
      console.log("Video ended");
      // go to next video
      let query = "ytd-reel-video-renderer#" + getUnicodeNumber(videoId + 1);
      let nextShort = document.querySelector(query);
      console.log("nextShort", nextShort, query);
      if (nextShort) {
        nextShort.scrollIntoView();
        videoId++;
        videoLoopDeactivated = false;
        videoObserver.observe(document, config);
      }
    });
  }
  // let lastUrl = location.href;
  // new MutationObserver(() => {
  //   const url = location.href;
  //   if (url !== lastUrl) {
  //     lastUrl = url;
  //     onUrlChange();
  //   }
  // }).observe(document, { subtree: true, childList: true });

  // function onUrlChange() {
  //   console.log("URL changed!", location.href);
  // }
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
