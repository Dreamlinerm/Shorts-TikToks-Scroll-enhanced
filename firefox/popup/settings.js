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

// find out if on settings page or on popup page
if (window.outerWidth > 100) {
  document.querySelector("#Export").style.display = "block";
}

// global variables in localStorage
const defaultSettings = {
  settings: {
    skip: true,
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
function setCheckboxesToSettings() {
  let button = document.querySelector("#placeholder");
  if (button) button.checked = true;
  // import/export buttons
  button = document.querySelector("#save");
  if (button) {
    let file = new Blob([JSON.stringify(settings)], { type: "text/json" });
    button.href = URL.createObjectURL(file);
    button.download = "settings.json";
  }
}
/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
  let listener = document.addEventListener("click", (e) => {
    if (e.target.classList.contains("reset")) {
      console.log("settings resetted to", defaultSettings);
      browser.storage.sync.set(defaultSettings);
    } else if (e.target.id === "placeholder") {
      console.log("placeholder");
      browser.storage.sync.set({ settings });
    } else if (e.target.id === "upload") {
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
} catch (e) {
  reportExecuteScriptError(e);
}
