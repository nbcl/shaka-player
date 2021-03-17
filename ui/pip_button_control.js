/*! @license
 * Shaka Player
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */


goog.provide('shaka.ui.PipButtonControl');

goog.require('shaka.ui.Controls');
goog.require('shaka.ui.Element');
goog.require('shaka.ui.Enums');
goog.require('shaka.ui.Utils');
goog.require('shaka.util.Dom');
goog.require('shaka.util.FakeEvent');
goog.requireType('shaka.ui.Controls');


/**
 * @extends {shaka.ui.Element}
 * @final
 * @export
 */
shaka.ui.PipButtonControl = class extends shaka.ui.Element {
  /**
   * @param {!HTMLElement} parent
   * @param {!shaka.ui.Controls} controls
   */
  constructor(parent, controls) {
    super(parent, controls);

    /** @private {HTMLMediaElement} */
    this.localVideo_ = this.controls.getLocalVideo();

    /** @private {!HTMLButtonElement} */
    this.pipButton_ = shaka.util.Dom.createButton();
    this.pipButton_.classList.add('shaka-pip-button');
    this.pipButton_.classList.add('material-icons-round');
    this.pipButton_.textContent = shaka.ui.Enums.MaterialDesignIcons.PIP;

    this.parent.appendChild(this.pipButton_);

    // Don't display the button if PiP is not supported or not allowed.
    // TODO: Can this ever change? Is it worth creating the button if the below
    // condition is true?
    if (!this.isPipAllowed_()) {
      shaka.ui.Utils.setDisplay(this.pipButton_, false);
    }

    this.eventManager.listen(this.pipButton_, 'click', () => {
      this.onPipClick_();
    });

    this.eventManager.listen(this.localVideo_, 'enterpictureinpicture', () => {
      this.onEnterPictureInPicture_();
    });

    this.eventManager.listen(this.localVideo_, 'leavepictureinpicture', () => {
      this.onLeavePictureInPicture_();
    });

    this.eventManager.listen(this.controls, 'caststatuschanged', (e) => {
      this.onCastStatusChange_(e);
    });

    this.eventManager.listen(this.player, 'trackschanged', () => {
      this.onTracksChanged_();
    });
  }


  /**
   * @return {boolean}
   * @private
   */
  isPipAllowed_() {
    return document.pictureInPictureEnabled &&
        !this.video.disablePictureInPicture;
  }


  /**
   * @return {!Promise}
   * @private
   */
  async onPipClick_() {
    try {
      if (!document.pictureInPictureElement) {
        // If you were fullscreen, leave fullscreen first.
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        await this.video.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      this.controls.dispatchEvent(new shaka.util.FakeEvent('error', {
        detail: error,
      }));
    }
  }


  /** @private */
  onEnterPictureInPicture_() {
    this.pipButton_.textContent = shaka.ui.Enums.MaterialDesignIcons.EXIT_PIP;
  }


  /** @private */
  onLeavePictureInPicture_() {
    this.pipButton_.textContent = shaka.ui.Enums.MaterialDesignIcons.PIP;
  }


  /**
   * @param {Event} e
   * @private
   */
  onCastStatusChange_(e) {
    const isCasting = e['newStatus'];

    if (isCasting) {
      // Picture-in-picture is not applicable if we're casting
      if (this.isPipAllowed_()) {
        shaka.ui.Utils.setDisplay(this.pipButton_, false);
      }
    } else {
      if (this.isPipAllowed_()) {
        shaka.ui.Utils.setDisplay(this.pipButton_, true);
      }
    }
  }


  /**
   * Display the picture-in-picture button only when the content contains video.
   * If it's displaying in picture-in-picture mode, and an audio only content is
   * loaded, exit the picture-in-picture display.
   * @return {!Promise}
   * @private
   */
  async onTracksChanged_() {
    if (!this.isPipAllowed_()) {
      shaka.ui.Utils.setDisplay(this.pipButton_, false);
    } else if (this.player && this.player.isAudioOnly()) {
      shaka.ui.Utils.setDisplay(this.pipButton_, false);
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } else {
      shaka.ui.Utils.setDisplay(this.pipButton_, true);
    }
  }
};


/**
 * @implements {shaka.extern.IUIElement.Factory}
 * @final
 */
shaka.ui.PipButtonControl.Factory = class {
  /** @override */
  create(rootElement, controls) {
    return new shaka.ui.PipButtonControl(rootElement, controls);
  }
};

shaka.ui.Controls.registerElement(
    'picture_in_picture', new shaka.ui.PipButtonControl.Factory());
