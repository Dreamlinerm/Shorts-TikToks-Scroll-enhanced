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

// find out if on settings page or on popup page
// if document.title is "Streaming enhanced" then it is not the popup page
// if (window?.outerWidth > 400) {
//   AmazonSettings();
//   NetflixSettings();
//   // Statistics();
//   document.querySelector("#Export").style.display = "block";
// }

/**
 * Localize by replacing __MSG_***__ meta tags
 * @returns {void}
 */
function localizeHtmlPage() {
  // https://stackoverflow.com/questions/25467009/internationalization-of-html-pages-for-my-google-chrome-extension
  // let objects = document.getElementsByTagName("html");
  // for (obj of objects) {
  //   let valStrH = obj.innerHTML.toString();
  //   let valNewH = valStrH.replace(/__MSG_((?!\_).*)__/g, function (match, v1) {
  //     let messages = v1.split(";");
  //     return messages ? browser.i18n.getMessage.apply(null, messages) : "";
  //   });

  //   if (valNewH != valStrH) {
  //     obj.innerHTML = valNewH;
  //   }
  // }

  //innerHTML triggers warnings so changed functions

  // i18n tag
  let translations = document.getElementsByTagName("i18n");
  for (trans of translations) {
    let Translated = browser.i18n.getMessage.apply(null, trans.textContent.split(";"));
    trans.textContent = Translated;
  }
  // i18n attribute
  translations = document.querySelectorAll("[i18n]");
  for (trans of translations) {
    let Translated = browser.i18n.getMessage.apply(null, trans.textContent.split(";"));
    trans.textContent = Translated;
  }
}

localizeHtmlPage();

// remove everything before # in window.location
let url = window.location.href;
if (url.includes("#")) Menu(url.split("#")[1]);

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
browser.storage.sync.get("settings", function (result) {
  settings = result.settings;
  if (typeof settings !== "object") {
    browser.storage.sync.set(defaultSettings);
  } else {
    console.log("settings:", settings);
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
    setCheckboxesToSettings();
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
      setCheckboxesToSettings();
    }
  }
});
function getTimeFormatted(sec = 0) {
  if (typeof sec !== "number") return "0s";
  let days = Math.floor(sec / 86400);
  let hours = Math.floor((sec % 86400) / 3600);
  let minutes = Math.floor(((sec % 86400) % 3600) / 60);
  let seconds = Math.floor(((sec % 86400) % 3600) % 60);
  let text;
  if (days > 0) text = `${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) text = `${hours}h ${minutes}m ${seconds}s`;
  else if (minutes > 0) text = `${minutes}m ${seconds}s`;
  else text = `${seconds}s`;
  return text;
}
function setCheckboxesToSettings() {
  let button;

  //  -------------      Default        ---------------------------------------

  //  -------------      Tiktok        ---------------------------------------
  button = document.querySelector("#TikTokSkips");
  if (button) button.checked = settings?.TikTok.autoScroll && settings?.TikTok.speedSlider;
  button = document.querySelector("#TikTokAutoScroll");
  if (button) button.checked = settings?.TikTok.autoScroll;
  button = document.querySelector("#TikTokSpeedSlider");
  if (button) button.checked = settings?.TikTok.speedSlider;

  //  -------------      Youtube        ---------------------------------------
  button = document.querySelector("#YoutubeSkips");
  if (button) button.checked = settings?.Youtube.autoScroll && settings?.Youtube.speedSlider;
  button = document.querySelector("#YoutubeAutoScroll");
  if (button) button.checked = settings?.Youtube.autoScroll;
  button = document.querySelector("#YoutubeSpeedSlider");
  if (button) button.checked = settings?.Youtube.speedSlider;

  // general video settings

  //  -------------      Slider Options        ---------------------------------------
  button = document.querySelector("#SliderSteps");
  if (button) button.value = settings?.General.sliderSteps;
  button = document.querySelector("#SliderMin");
  if (button) button.value = settings?.General.sliderMin;
  button = document.querySelector("#SliderMax");
  if (button) button.value = settings?.General.sliderMax;
  button = document.querySelector("#SliderPreview");
  if (button) {
    button.step = settings?.General.sliderSteps;
    button.min = settings?.General.sliderMin;
    button.max = settings?.General.sliderMax;
  }
  button = document.querySelector("#SliderValue");
  if (button) button.textContent = sliderValue / 10 + "x";

  // Statistics

  // import/export buttons
  button = document.querySelector("#save");
  if (button) {
    let file = new Blob([JSON.stringify(settings)], { type: "text/json" });
    button.href = URL.createObjectURL(file);
    button.download = "settings.json";
  }
}
// open and close the Amazon and Netflix Individual Settings
function openIndividualSettings(setting) {
  const open = document.getElementById(setting + "Settings").style.display === "none";
  document.getElementById(setting + "Settings").style.display = open ? "block" : "none";
  document.getElementsByClassName(setting + "DownArrow")[0].style.display = open ? "none" : "block";
  document.getElementsByClassName(setting + "UpArrow")[0].style.display = open ? "block" : "none";
}
function Menu(setting) {
  const Pages = ["TikTok", "Youtube", "Other", "Default"];
  const noButton = ["Default"];
  for (const page of Pages) {
    document.getElementById(page + "Settings").style.display = "none";
    if (!noButton.includes(page)) document.getElementById("Menu" + page).style.setProperty("background-color", "");
  }
  document.getElementById(setting + "Settings").style.display = "block";
  if (!noButton.includes(setting)) document.getElementById("Menu" + setting).style.setProperty("background-color", "#e60010");
}
/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function setSettings(log) {
  console.log(log, settings);
  browser.storage.sync.set({ settings });
}
function listenForClicks() {
  let listener = document.addEventListener("click", (e) => {
    if (e.target.classList.contains("reset")) {
      if (confirm("Are you sure to reset every Setting including Statistics?")) {
        console.log("settings resetted to default");
        browser.storage.sync.set(defaultSettings);
      }
    }
    //  -------------      Menu        ---------------------------------------
    else if (e.target.id === "MenuTikTok") {
      Menu("TikTok");
    } else if (e.target.id === "MenuYoutube") {
      Menu("Youtube");
    } else if (e.target.id === "MenuOther") {
      Menu("Other");
    }
    //  -------------      openSettings        ---------------------------------------
    else if (e.target.id === "openTikTokSettings") {
      openIndividualSettings("TikTok");
    } else if (e.target.id === "openYoutubeSettings") {
      openIndividualSettings("Youtube");
    }
    // -------------      Default        ---------------------------------------
    //  -------------      TikTok        ---------------------------------------
    else if (e.target.id === "TikTokSkips") {
      const TikTokSkips = !(settings?.TikTok.autoScroll && settings?.TikTok.speedSlider);
      settings.TikTok.autoScroll = TikTokSkips;
      settings.TikTok.speedSlider = TikTokSkips;
      setSettings("All TikTokSkips");
    } else if (e.target.id === "TikTokAutoScroll") {
      settings.TikTok.autoScroll = !settings.TikTok.autoScroll;
      setSettings("TikTokAutoScroll");
    } else if (e.target.id === "TikTokSpeedSlider") {
      settings.TikTok.speedSlider = !settings.TikTok.speedSlider;
      setSettings("TikTokSpeedSlider");
    }

    //  -------------      Youtube        ---------------------------------------
    else if (e.target.id === "YoutubeSkips") {
      const YoutubeSkips = !(settings?.Youtube.autoScroll && settings?.Youtube.speedSlider);
      settings.Youtube.autoScroll = YoutubeSkips;
      settings.Youtube.speedSlider = YoutubeSkips;
      setSettings("All YoutubeSkips");
    } else if (e.target.id === "YoutubeAutoScroll") {
      settings.Youtube.autoScroll = !settings.Youtube.autoScroll;
      setSettings("YoutubeAutoScroll");
    } else if (e.target.id === "YoutubeSpeedSlider") {
      settings.Youtube.speedSlider = !settings.Youtube.speedSlider;
      setSettings("YoutubeSpeedSlider");
    }

    //  -------------      Video        ---------------------------------------

    //  -------------      Upload        ---------------------------------------
    else if (e.target.id === "upload") {
      // get the file from #file and console.log it
      const file = document.getElementById("file").files[0];
      if (file !== undefined && "application/json" === file.type) {
        if (confirm(file.name + " will replace the Settings.\n\nAre you sure you want to do this?")) {
          // read contents of file
          const reader = new FileReader();
          // reader.onload = (e) => {
          reader.addEventListener("load", (e) => {
            try {
              // parse the JSON
              const data = JSON.parse(e.target.result);
              // set the settings to the parsed JSON
              settings = data;
              // save the settings to the storage
              browser.storage.sync.set({ settings });
              // reload the page
              location.reload();
              // };
            } catch (e) {
              alert("The file you uploaded is not a valid JSON file.");
              return;
            }
          });
          reader.readAsText(file);
        }
      } else {
        alert("The file you uploaded is not a valid JSON file.");
        return;
      }
    }
  });
}

function listenForInput() {
  document.addEventListener("input", (e) => {
    if (e.target.id === "SliderSteps") {
      settings.General.sliderSteps = Number(e.target.value);
      setCheckboxesToSettings();
      setSettings("SliderSteps");
    } else if (e.target.id === "SliderMin") {
      settings.General.sliderMin = Number(e.target.value);
      sliderValue = settings.General.sliderMin;
      setCheckboxesToSettings();
      setSettings("SliderMin");
    } else if (e.target.id === "SliderMax") {
      settings.General.sliderMax = Number(e.target.value);
      sliderValue = settings.General.sliderMax;
      setCheckboxesToSettings();
      setSettings("SliderMax");
    } else if (e.target.id === "SliderPreview") {
      sliderValue = Number(e.target.value);
      setCheckboxesToSettings();
    }
  });
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(`Failed to execute primeskip content script: ${error.message}`);
}

/**
 * When the popup loads, add a click handler.
 * If we couldn't inject the script, handle the error.
 */
try {
  listenForClicks();
  listenForInput();
} catch (e) {
  reportExecuteScriptError(e);
}
