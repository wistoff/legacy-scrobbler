import { reactive } from 'vue'

const DEVICE_STATES = {
  NOT_CONNECTED: 'not-connected',
  NO_PLAYS: 'no-plays',
  READY: 'ready'
}

const POPUP_STATES = {
  ACCESS: {
    title: 'Welcome to Legacy Scrobbler',
    message:
      "You're just a few steps away from transferring your iPod listening history to your Last.fm profile. To use the Scrobbler, simply grant Legacy Scrobbler permissions to access your Last.fm profile.",
    button: 'Allow Access'
  },
  ABOUT: {
    title: 'About Legacy Scrobbler',
    message: `
    <b> Version: 1.0.0</b>

    <p class="credits"> <b>Credits:</b><br/>
    Legacy Scrobbler utilizes icons from Iconoir under the MIT License.<br/>
    Legacy Scrobbler is distributed under the GPL v3 License.<br/><br/>
    <b>Disclaimer:</b><br/>
    Legacy Scrobbler is a third-party tool developed independently. Last.fm and iPod are registered trademarks of their respective owners. Legacy Scrobbler is not endorsed by or affiliated with Last.fm or Apple Inc.<br/><br/>
    www.legacyscrobbler.software<br/><br/>
    2024 Kjell Wistoff<br/></p>
`,
    button: 'Close'
  }
}

export const globalPopup = reactive({
  state: false,
  content: POPUP_STATES.ACCESS
})

export const errorPopup = reactive({
  state: false,
  msg: ''
})

export const globalDeviceState = reactive({
  value: DEVICE_STATES.NOT_CONNECTED
})

export const useStates = () => {
  const setDeviceState = newState => {
    globalDeviceState.value = newState
  }

  const showAccessPopup = () => {
    globalPopup.state = true
    globalPopup.content = POPUP_STATES.ACCESS
  }

  const showErrorPopup = msg => {
    errorPopup.state = true
    errorPopup.msg = msg
  }

  const showAboutPopup = () => {
    globalPopup.state = true
    globalPopup.content = POPUP_STATES.ABOUT
  }

  return {
    deviceState: globalDeviceState,
    popup: globalPopup,
    errorPopup: errorPopup,
    setDeviceState,
    showErrorPopup,
    showAccessPopup,
    showAboutPopup
  }
}
