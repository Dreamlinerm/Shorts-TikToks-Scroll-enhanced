/*
 * Streaming enhanced
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
// matches all amazon urls under https://en.wikipedia.org/wiki/Amazon_(company)#Website
let hostname = window.location.hostname;
let title = document.title;
let url = window.location.href;
let ua = window.navigator.userAgent;
// only on prime video pages
const isShort = /shorts/i.test(url);
const isTikTok = /tiktok/i.test(url);

let isEdge = /edg/i.test(ua);
let isFirefox = /firefox/i.test(ua);
const version = "1.0.0";
if (isShort || isTikTok) {
  // global variables in localStorage
  const defaultSettings = {
    settings: {
      TikTok: { autoScroll: true, speedSlider: true },
      Youtube: { autoScroll: true, speedSlider: true },
      Statistics: {},
      General: { sliderSteps: 1, sliderMin: 5, sliderMax: 20 },
      Statistics: { SegmentsSkipped: 0 },
    },
  };
  let settings = defaultSettings.settings;
  let videoSpeed;
  async function setVideoSpeed(speed) {
    videoSpeed = speed;
  }
  resetBadge();
  browser.storage.sync.get("settings", function (result) {
    settings = result.settings;
    console.log("Youtube Enhancer");
    console.log("version:", version);
    console.log("Settings", settings);
    if (isShort) console.log("Page %cYoutube shorts", "color: #e60010;");
    else if (isTikTok) console.log("Page %cTikTok", "color: #e60010;");
    if (typeof settings !== "object") {
      browser.storage.sync.set(defaultSettings);
    } else {
      if (isTikTok) {
        // start Observers depending on the settings
        TikTokObserver.observe(document, config);
      } else if (isShort) {
        // start Observers depending on the settings
        YoutubeObserver.observe(document, config);
      }
      let changedSettings = false;
      for (const key in defaultSettings.settings) {
        if (typeof settings[key] === "undefined") {
          log("undefined Setting:", key);
          changedSettings = true;
          settings[key] = defaultSettings.settings[key];
        } else {
          for (const subkey in defaultSettings.settings[key]) {
            if (typeof settings[key][subkey] === "undefined") {
              log("undefined Setting:", key, subkey);
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
        log(key, "Old value:", oldValue, ", new value:", newValue);
      }
    }
  });
  function log(a1, a2 = " ", a3 = " ", a4 = " ", a5 = " ") {
    const date = new Date();
    console.log(date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(), a1, a2, a3, a4, a5);
  }

  // Observers
  // default Options for the observer (which mutations to observe)
  const config = { attributes: true, childList: true, subtree: true };

  // TikTok Observer
  const TikTokObserver = new MutationObserver(TikTok);
  function TikTok(mutations, observer) {
    if (settings.TikTok.autoScroll) {
      // auto scroll to next video when video finished
      const video = document.querySelector("video");
      if (video) {
        if (Math.round(video.currentTime * 10) / 10 == Math.round(video.duration * 10) / 10) {
          console.log("Video finished");
          skipButton = document.querySelector("button[data-e2e='arrow-right']");
          if (skipButton) {
            skipButton.click();
            console.log("Clicked next video");
            increaseBadge();
          }
        }
      }
    }
  }

  // current time of the video
  let currentTime = 0;
  let currentVideoId = "";
  // Youtube Observer
  const YoutubeObserver = new MutationObserver(Youtube);
  function Youtube(mutations, observer) {
    const reel = document.querySelector("ytd-reel-video-renderer[is-active='']");
    const video = reel?.querySelector("video");
    if (settings.Youtube.autoScroll && video) {
      // auto scroll to next video when video finished
      if (currentVideoId != reel.getAttribute("id")) {
        currentTime = video.currentTime;
        currentVideoId = reel.getAttribute("id");
      }
      if (currentTime > video.currentTime) {
        const selector = "ytd-reel-video-renderer[id='" + (Number(reel.getAttribute("id")) + 1) + "']";
        const nextVideo = document.querySelector(selector);
        if (nextVideo) {
          currentTime = 0;
          nextVideo.scrollIntoView();
          console.log("Clicked next video");
          increaseBadge();
        }
      } else {
        currentTime = video.currentTime;
      }
    }
    if (settings.Youtube.speedSlider) {
      if (video) {
        let alreadySlider = reel.querySelector("ytd-shorts-player-controls").querySelector("#videoSpeedSlider");
        if (!alreadySlider) {
          let position = reel.querySelector("ytd-shorts-player-controls");
          if (position) {
            videoSpeed = videoSpeed ? videoSpeed : video.playbackRate;

            let slider = document.createElement("input");
            slider.id = "videoSpeedSlider";
            slider.type = "range";
            slider.min = settings.General.sliderMin;
            slider.max = settings.General.sliderMax;
            slider.value = videoSpeed * 10;
            slider.step = settings.General.sliderSteps;
            slider.style = "pointer-events: auto;background: rgb(221, 221, 221);display: none;width:150px;";

            let speed = document.createElement("p");
            speed.id = "videoSpeed";
            speed.textContent = videoSpeed ? videoSpeed + "x" : "1x";
            // makes the button clickable
            // speed.setAttribute("class", "control-icon-btn");
            speed.style = "font-size:2em;color:#f9f9f9;pointer-events: auto;padding: 0 5px;";

            position.insertBefore(speed, position.children[position.children.length - 1]);
            position.insertBefore(slider, position.children[position.children.length - 1]);

            if (videoSpeed) video.playbackRate = videoSpeed;
            speed.onclick = function () {
              if (slider.style.display === "block") slider.style.display = "none";
              else slider.style.display = "block";
            };
            slider.oninput = function () {
              speed.textContent = this.value / 10 + "x";
              video.playbackRate = this.value / 10;
              setVideoSpeed(this.value / 10);
            };
          }
        } else {
          // need to resync the slider with the video sometimes
          let speed = reel.querySelector("ytd-shorts-player-controls").querySelector("#videoSpeed");
          if (video.playbackRate != videoSpeed) {
            video.playbackRate = videoSpeed;
          }
          if (alreadySlider.value != videoSpeed * 10) {
            alreadySlider.value = videoSpeed * 10;
            speed.textContent = videoSpeed + "x";
          }
        }
      }
    }
    // else {
    //   let Sliders = document.querySelectorAll("#videoSpeedSlider");
    //   let Speeds = document.querySelectorAll("#videoSpeed");
    //   for (slider of Sliders) slider.remove();
    //   for (speed of Speeds) speed.remove();
    // }
  }

  // Badge functions
  function setBadgeText(text) {
    browser.runtime.sendMessage({
      type: "setBadgeText",
      content: text,
    });
  }
  function increaseBadge() {
    settings.Statistics.SegmentsSkipped++;
    browser.storage.sync.set({ settings });
    browser.runtime.sendMessage({
      type: "increaseBadge",
    });
  }
  function resetBadge() {
    browser.runtime.sendMessage({
      type: "resetBadge",
    });
  }
}
