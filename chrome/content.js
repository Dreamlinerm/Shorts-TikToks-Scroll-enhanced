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
      Youtube: { autoScroll: true, speedSlider: true, lowViews: true, volumeSlider: true },
      Statistics: {},
      General: { lowViewsUpvotes: 200, sliderSteps: 1, sliderMin: 5, sliderMax: 20 },
      Statistics: { SegmentsSkipped: 0 },
    },
  };
  let settings = defaultSettings.settings;
  let videoSpeed = 1;
  let videoVolume;
  async function setVideoSpeed(speed) {
    videoSpeed = speed;
  }
  async function setVideoVolume(volume) {
    videoVolume = volume;
  }
  resetBadge();
  chrome.storage.sync.get("settings", function (result) {
    settings = result.settings;
    console.log("Youtube Enhancer");
    console.log("version:", version);
    console.log("Settings", settings);
    if (isShort) console.log("Page %cYoutube shorts", "color: #e60010;");
    else if (isTikTok) console.log("Page %cTikTok", "color: #e60010;");
    if (typeof settings !== "object") {
      chrome.storage.sync.set(defaultSettings);
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
        chrome.storage.sync.set({ settings });
      }
    }
  });

  chrome.storage.sync.onChanged.addListener(function (changes, namespace) {
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
    if (settings.Youtube.speedSlider && reel) {
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
    if (settings.Youtube.lowViews && reel) {
      let upvoteText = reel.querySelector("ytd-like-button-renderer")?.querySelector("span").textContent;
      // convert K and M to numbers
      // convert the number 8.1K to 8100
      function convertToNumber(str) {
        const num = parseFloat(str);

        if (isNaN(num)) {
          return null; // return NaN if the input cannot be parsed as a number
        }

        if (str.toUpperCase().includes("K")) {
          return num * 1000; // multiply by 1000 to convert from K to the actual number
        }
        if (str.toUpperCase().includes("M")) {
          return num * 1000000; // multiply by 1000000 to convert from M to the actual number
        }
        return num; // return the number as is if no conversion is needed
      }

      let upvotes = convertToNumber(upvoteText);
      if (upvotes && upvotes < settings.General.lowViewsUpvotes) {
        const selector = "ytd-reel-video-renderer[id='" + (Number(reel.getAttribute("id")) + 1) + "']";
        const nextVideo = document.querySelector(selector);
        if (nextVideo) {
          currentTime = 0;
          nextVideo.scrollIntoView();
          console.log("Too few upvotes:", upvotes);
          increaseBadge();
        }
      }
    }
    // convert this to javascript
    // autoplay switch on page
    if (video) {
      let alreadySlider = reel.querySelector("ytd-reel-player-overlay-renderer").querySelector("#YoutubeAutoScroll");
      if (!alreadySlider) {
        // reel = document.querySelector("ytd-reel-video-renderer[is-active='']")
        let position = reel.querySelector("ytd-reel-player-overlay-renderer").children[1];
        if (position) {
          // <label class="switch">
          //           <input type="checkbox" id="YoutubeAutoScroll" />
          //           <span class="slider round"></span>
          //         </label>
          let div = document.createElement("div");

          let label = document.createElement("label");
          label.class = "switch";
          label.setAttribute("class", "switch");

          let input = document.createElement("input");
          input.type = "checkbox";
          input.id = "YoutubeAutoScroll";
          input.checked = settings.General.autoScroll;

          let span = document.createElement("span");
          span.setAttribute("class", "slider round");

          label.appendChild(input);
          label.appendChild(span);
          let style = document.createElement("style");
          style.type = "text/css";
          style.innerHTML = `/* Switch styling */
            label {
              margin-left: auto;
            }
            /* The switch - the box around the slider */
            .switch {
              position: relative;
              display: inline-block;
              width: 48px;
              height: 27px;
            }
            
            /* Hide default HTML checkbox */
            .switch input {
              opacity: 0;
              width: 0;
              height: 0;
            }
            
            /* The slider */
            .slider {
              position: absolute;
              cursor: pointer;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: #3f3f3f;
              -webkit-transition: 0.4s;
              transition: 0.4s;
            }
            
            .slider:before {
              position: absolute;
              content: "";
              height: 19px;
              width: 19px;
              left: 4px;
              bottom: 4px;
              background-color: white;
              /* -webkit-transition: 0.4s;
               transition: 0.4s; */
            }
            
            input:checked + .slider {
              background-color: #006303;
            }
            /* change color on hover */
            input:checked + .slider:hover {
              background-color: #00a205;
            }
            
            input:checked + .slider:before {
              -webkit-transform: translateX(18px);
              -ms-transform: translateX(18px);
              transform: translateX(18px);
            }
            
            /* Rounded sliders */
            .slider.round {
              border-radius: 34px;
            }
            
            .slider.round:before {
              border-radius: 50%;
            }`;
          document.querySelector("head").appendChild(style);
          div.appendChild(label);

          let p = document.createElement("span");
          p.textContent = "Autoplay";
          p.style = "color:white;font-size: 1.4rem;line-height: 2rem;margin-top: 4px;display: block;text-align: center;";
          // p.setAttribute(
          //   "class",
          //   "yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap yt-core-attributed-string--text-alignment-center yt-core-attributed-string--word-wrapping"
          // );
          div.appendChild(p);
          position.insertBefore(div, position.firstChild);
          label.onclick = function () {
            settings.Youtube.autoScroll = !settings.Youtube.autoScroll;
            chrome.storage.sync.set({ settings });
          };
        }
      } else {
        alreadySlider.checked = settings.Youtube.autoScroll;
        alreadySlider.onclick = function () {
          settings.Youtube.autoScroll = !settings.Youtube.autoScroll;
          chrome.storage.sync.set({ settings });
        };
      }
    }
    if (settings.Youtube.volumeSlider && reel) {
      if (video) {
        let alreadySlider = reel.querySelector("ytd-shorts-player-controls")?.querySelector("#videoVolumeSlider");
        if (!alreadySlider) {
          let position = reel.querySelector("ytd-shorts-player-controls");
          if (position) {
            videoVolume = videoVolume ? videoVolume : video.volume;

            let slider = document.createElement("input");
            slider.id = "videoVolumeSlider";
            slider.setAttribute("orient", "vertical");
            slider.type = "range";
            slider.min = 0;
            slider.max = 1;
            slider.value = videoVolume;
            slider.step = 0.01;
            slider.style = "height: 100px;opacity:0.6;pointer-events: auto;background: rgb(221, 221, 221); position: absolute;right: 16px;top: 40px;";
            position.appendChild(slider, position.children[position.children.length - 1]);

            if (videoVolume) video.volume = videoVolume;

            slider.oninput = function () {
              video.volume = this.value;
              setVideoVolume(this.value);
            };
          }
        } else {
          videoVolume = videoVolume ? videoVolume : video.volume;
          // need to resync the slider with the video sometimes
          if (video.volume != videoVolume) {
            video.volume = videoVolume;
          }
          if (alreadySlider.value != videoVolume) {
            alreadySlider.value = videoVolume;
          }
        }
      }
    }
  }
  // on left right arrow 5 sec skip
  document.onkeydown = checkKey;
  function checkKey(e) {
    const video = document.querySelector("ytd-reel-video-renderer[is-active='']")?.querySelector("video");
    if (!video) return;
    if (e.keyCode == "37") {
      currentTime = video.currentTime - 5 >= 0 ? video.currentTime - 5 : 0;
      video.currentTime -= 5;
      console.log("left arrow");
    } else if (e.keyCode == "39") {
      video.currentTime += 5;
      console.log("right arrow");
    }
  }

  // Badge functions
  function setBadgeText(text) {
    chrome.runtime.sendMessage({
      type: "setBadgeText",
      content: text,
    });
  }
  function increaseBadge() {
    settings.Statistics.SegmentsSkipped++;
    chrome.storage.sync.set({ settings });
    chrome.runtime.sendMessage({
      type: "increaseBadge",
    });
  }
  function resetBadge() {
    chrome.runtime.sendMessage({
      type: "resetBadge",
    });
  }
}
