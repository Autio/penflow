// JavaScript source code
// editor
PenFlow = window.PenFlow || {};
PenFlow.editor = (function () {

	// Components of the editor
	var headerArea, contentArea, lastType, currentNodeList, lastSelection;

	// Components of the text option box
	var textOptions, textOptionBox, boldButton, italicButton, quoteButton, urlButton, urlInput;

	var writing;

	function init() {

		writing = false;
		bindElements();
		createEventBindings();

		// If storage is supported then load the existing writing
		if (PenFlow.util.supportsHtmlStorage()) {
			loadState();
		} else {
			loadDefault();
		}

		// Set position of cursor
		var range = document.createRange();
		var selection = window.getSelection();
		range.setStart(headerArea, 1);
		selection.removeAllRanges();
		selection.addRange(range);

	}

	function createEventBindings() {

		// Binding the key up
		if (PenFlow.util.supportsHtmlStorage()) {

			document.onkeyup = function (event) {
				checkTextHighlighting(event);
				// Save after each keystroke
				saveState();
			}

		} else {
			document.onkeyup = checkTextHighlighting;
		}

		// Bind mouse buttons
		document.onmousedown = checkTextHighlighting;
		document.onmouseup = function (event) {

			setTimeout(function () {
				checkTextHighlighting(event);
			}, 1);
		};

		// Window bindings
		document.body.addEventListener('scroll', function () {
			updateBoxPosition();
		});
		window.addEventListener('resize', function (event) {
			updateBoxPosition();
		});

		// Writing bindings to separate writing from text selection
		document.addEventListener('compositionstart', onWritingStart);
		document.addEventListener('compositionend', onWritingEnd);
	}


	function bindElements() {

		textOptions = document.querySelector('.text-options');
		textOptionBox = textOptions.querySelector('.options');

		headerArea = document.querySelector('.header');
		contentArea = document.querySelector('.content');

		boldButton = textOptions.querySelector('.bold');
		boldButton.onclick = onBoldClick;

		italicButton = textOptions.querySelector('.italic');
		italicButton.onclick = onItalicClick;

		quoteButton = textOptions.querySelector('.quote');
		quoteButton.onclick = onQuoteClick;

		urlButton = textOptions.querySelector('.url');
		urlButton.onmousedown = onUrlClick;

		urlInput = textOptions.querySelector('.url-input');
		urlInput.onblur = onUrlInputBlur;
		urlInput.onkeydown = onUrlInputKeyDown;
	}

	function checkTextHighlighting(event) {

		var selection = window.getSelection();

		if ((event.target.className === "url-input" ||
			event.target.classList.contains("url") ||
			event.target.parentNode.classList.contains("ui-inputs"))) {

			currentNodeList = findNodes(selection.focusNode);
			updateBoxStates();
			return;
		}

		// Check selections exist
		if (selection.isCollapsed === true && lastType === false) {

			onSelectorBlur();
		}

		// When text is seleceted
		if (selection.isCollapsed === false && writing  === false) {

			currentNodeList = findNodes(selection.focusNode);

			// Find if highlighting is in the editable area
			if (hasNode(currentNodeList, "ARTICLE")) {
				updateBoxStates();
				updateBoxPosition();

				// Show the text options box
				textOptions.className = "text-options active";
			}
		}

		lastType = selection.isCollapsed;
	}

	function updateBoxPosition() {
		var selection = window.getSelection();
		var range = selection.getRangeAt(0);
		var boundary = range.getBoundingClientRect();

		textOptions.style.top = boundary.top - 5 + window.pageYOffset + "px";
		textOptions.style.left = (boundary.left + boundary.right) / 2 + "px";
	}

	function updateBoxStates() {

		if (hasNode(currentNodeList, 'B')) {
			boldButton.className = "bold active"
		} else {
			boldButton.className = "bold"
		}

		if (hasNode(currentNodeList, 'I')) {
			italicButton.className = "italic active"
		} else {
			italicButton.className = "italic"
		}

		if (hasNode(currentNodeList, 'BLOCKQUOTE')) {
			quoteButton.className = "quote active"
		} else {
			quoteButton.className = "quote"
		}

		if (hasNode(currentNodeList, 'A')) {
			urlButton.className = "url active"
		} else {
			urlButton.className = "url"
		}
	}

	function onSelectorBlur() {

		textOptions.className = "text-options fade";
		setTimeout(function () {

			if (textOptions.className == "text-options fade") {

				textOptions.className = "text-options";
				textOptions.style.top = '-999px';
				textOptions.style.left = '-999px';
			}
		}, 260)
	}

	function findNodes(element) {

		var nodeNames = {};

		// Internal node?
		var selection = window.getSelection();

		// if( selection.containsNode( document.querySelector('b'), false ) ) {
		// 	nodeNames[ 'B' ] = true;
		// }

		while (element.parentNode) {

			nodeNames[element.nodeName] = true;
			element = element.parentNode;

			if (element.nodeName === 'A') {
				nodeNames.url = element.href;
			}
		}

		return nodeNames;
	}

	function hasNode(nodeList, name) {

		return !!nodeList[name];
	}

	function saveState(event) {

		localStorage['header'] = headerArea.innerHTML;
		localStorage['content'] = contentArea.innerHTML;
	}

	function loadState() {

		if (localStorage['header']) {
			headerArea.innerHTML = localStorage['header'];
		} else {
			headerArea.innerHTML = defaultTitle; // in default.js
		}

		if (localStorage['content']) {
			contentArea.innerHTML = localStorage['content'];
		} else {
			loadDefaultContent()
		}
	}

	function loadDefault() {
		headerArea.innerHTML = defaultTitle; // in default.js
		loadDefaultContent();
	}

	function loadDefaultContent() {
		contentArea.innerHTML = defaultContent; // in default.js
	}

	function onBoldClick() {
		document.execCommand('bold', false);
	}

	function onItalicClick() {
		document.execCommand('italic', false);
	}

	function onQuoteClick() {

		var nodeNames = findNodes(window.getSelection().focusNode);

		// Activate quote block
		if (hasNode(nodeNames, 'BLOCKQUOTE')) {
			document.execCommand('formatBlock', false, 'p');
			//document.execCommand('outdent', true, null);


		} else {
			// Deactivate quote block
			//document.execCommand('indent', true, null);
			document.execCommand('formatBlock', false, 'blockquote');

		}
	}

	function onUrlClick() {

		if (textOptionBox.className == 'options') {

			textOptionBox.className = 'options url-mode';

			// Set timeout here to debounce the focus action
			setTimeout(function () {

				var nodeNames = findNodes(window.getSelection().focusNode);

				if (hasNode(nodeNames, "A")) {
					urlInput.value = nodeNames.url;
				} else {
					// Symbolize text turning into a link, which is temporary, and will never be seen.
					document.execCommand('createLink', false, '/');
				}

				// Since typing in the input box kills the highlighted text we need
				// to save this selection, to add the url link if it is provided.
				lastSelection = window.getSelection().getRangeAt(0);
				lastType = false;

				urlInput.focus();

			}, 100);

		} else {

			textOptionBox.className = 'options';
		}
	}

	function onUrlInputKeyDown(event) {

		if (event.keyCode === 13) {
			event.preventDefault();
			applyURL(urlInput.value);
			urlInput.blur();
		}
	}

	function onUrlInputBlur(event) {

		textOptionBox.className = 'options';
		applyURL(urlInput.value);
		urlInput.value = '';

		currentNodeList = findNodes(window.getSelection().focusNode);
		updateBoxStates();
	}

	function applyURL(url) {

		rehighlightLastSelection();

		// Unlink any current links
		document.execCommand('unlink', false);

		if (url !== "") {

			// Insert HTTP if it doesn't exist.
			if (!url.match("^(http|https)://")) {

				url = "http://" + url;
			}

			document.execCommand('createLink', false, url);
		}
	}

	function rehighlightLastSelection() {
		var selection = window.getSelection();
		if (selection.rangeCount > 0) {
			selection.removeAllRanges();
		}
		selection.addRange(lastSelection);
	}

	function getWordCount() {

		var text = PenFlow.util.getText(contentArea);

		if (text === "") {
			return 0
		} else {
			return text.split(/\s+/).length;
		}
	}

	function onWritingStart(event) {
		writing = true;
	}

	function onWritingEnd(event) {
		writing = false;
	}

	return {
		init: init,
		saveState: saveState,
		getWordCount: getWordCount
	}

})();