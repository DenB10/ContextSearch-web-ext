var userOptions = {};

browser.runtime.sendMessage({action: "getUserOptions"}).then( result => {
		
	userOptions = result.userOptions;

	// open findbar on pageload if set
	if ( window == top && userOptions.highLight.findBar.startOpen && !getFindBar()) {
		markOptions = userOptions.highLight.findBar.markOptions;
		updateFindBar(markOptions);
	}
});

// https://stackoverflow.com/a/11508164
function hexToRgb(hex) {
	hex = hex.replace("#", "");
    var bigint = parseInt(hex, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;

    return r + "," + g + "," + b;
}

function addStyling() {
	// append marking styles
	let styleEl = document.createElement('style');
	styleEl.id = 'CS_highlight_style';
	document.head.appendChild(styleEl);
	
	if ( userOptions.highLight.highlightStyle === 'background' ) {
	
		styleEl.innerText = `
			:root {
				--cs-mark-active-background: ${userOptions.highLight.activeStyle.background};
				--cs-mark-active-color: ${userOptions.highLight.activeStyle.color};
			}
			.CS_mark[data-style="0"], #CS_highLightNavBar > DIV[data-style="0"] { 
				background:rgba(` + hexToRgb(userOptions.highLight.styles[0].background) + ',' + userOptions.highLight.opacity + `);
				color:${userOptions.highLight.styles[0].color};
			}	
			.CS_mark[data-style="1"], #CS_highLightNavBar > DIV[data-style="1"] {
				background:rgba(` + hexToRgb(userOptions.highLight.styles[1].background) + ',' + userOptions.highLight.opacity + `);
				color:${userOptions.highLight.styles[1].color};
			}
			.CS_mark[data-style="2"], #CS_highLightNavBar > DIV[data-style="2"] {
				background:rgba(` + hexToRgb(userOptions.highLight.styles[2].background) + ',' + userOptions.highLight.opacity + `);
				color:${userOptions.highLight.styles[2].color};
			}
			.CS_mark[data-style="3"], #CS_highLightNavBar > DIV[data-style="3"] {
				background:rgba(` + hexToRgb(userOptions.highLight.styles[3].background) + ',' + userOptions.highLight.opacity + `);
				color:${userOptions.highLight.styles[3].color};
			}
			.CS_mark.CS_mark_selected, .CS_mark_selected {
				background: ${userOptions.highLight.activeStyle.background};
				color:${userOptions.highLight.activeStyle.color};
			}
			`;
	} else if ( userOptions.highLight.highlightStyle === 'underline' ) {
		
		styleEl.innerText = `
		:root {
			--cs-mark-active-background: ${userOptions.highLight.activeStyle.background};
			--cs-mark-active-color: ${userOptions.highLight.activeStyle.color};
		}
		.CS_mark[data-style="0"], #CS_highLightNavBar > DIV[data-style="0"] { 
			border-bottom: .2em solid ${userOptions.highLight.styles[0].background};
			color:inherit;
		}	
		.CS_mark[data-style="1"], #CS_highLightNavBar > DIV[data-style="1"] {
			border-bottom: .2em solid ${userOptions.highLight.styles[1].background};
			color:inherit;
		}
		.CS_mark[data-style="2"], #CS_highLightNavBar > DIV[data-style="2"] {
			border-bottom: .2em solid ${userOptions.highLight.styles[2].background};
			color:inherit;
		}
		.CS_mark[data-style="3"], #CS_highLightNavBar > DIV[data-style="3"] {
			border-bottom: .2em solid ${userOptions.highLight.styles[3].background};
			color:inherit;
		}
		.CS_mark.CS_mark_selected, .CS_mark_selected {
			border-bottom: .2em solid ${userOptions.highLight.activeStyle.background};
			color:inherit;
		}
		`;
	}
}

function removeStyling() {
	let styleEl = document.getElementById('CS_highlight_style');
	
	if ( styleEl ) styleEl.parentNode.removeChild(styleEl);
}

// ESC to clear markers and navbar and findbar
document.addEventListener('keydown', (e) => {
	if ( e.which === 27 ) {
		browser.runtime.sendMessage({action: "unmark"});
		browser.runtime.sendMessage({action: "closeFindBar"});
	}
});

// listen for findbar hotkey
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {

	if ( message.action === "openFindBar" ) {

		let searchTerms = message.searchTerms;
	
		window.getSelection().removeAllRanges();
		
		if ( !searchTerms ) 
			searchTerms = window.findBarLastSearchTerms || "";

		// search for selected terms
		// mark(Object.assign({
			// searchTerms: searchTerms, 
			// findBarSearch:true,	
		// }, userOptions.highLight.findBar.markOptions));
		browser.runtime.sendMessage(Object.assign({
			action: "mark",
			searchTerms: searchTerms, 
			findBarSearch:true,	
			source: "inject_highlight.js"
		}, userOptions.highLight.findBar.markOptions));
	}
});

// init marker.js object
var CS_MARK_instance = null;

var getFindBar = () => {return document.getElementById('CS_findBarIframe');}
var getFindBarContainer = () => {return document.getElementById('CS_findBarContainer');}
var getNavBar = () => {return document.getElementById('CS_highLightNavBar');}

// listen for execute_script call from background for search highlighting
document.addEventListener('CS_markEvent', (e) => {

	CS_MARK_instance = new Mark(document.body);
	
	// Chrome markings happened before loading userOptions
	let optionsCheck = setInterval( () => {
		if ( userOptions === {} ) return;
		
		clearInterval(optionsCheck);
		
		CS_MARK_instance = CS_MARK_instance || new Mark(document.body);
		CS_MARK_instance.unmark();
		
		let searchTerms = e.detail.searchTerms.trim();

		mark(Object.assign({
				searchTerms:searchTerms
			}, userOptions.highLight.markOptions
		));
		
		if ( getFindBar() )
			updateFindBar(userOptions.highLight.markOptions);
	
	}, 100);
	
});

function buildSearchWords(searchTerms) {
	
	// get quoted strings as single search term
	let phrases = searchTerms.match(/".*?"/g) || [];
	phrases.forEach( (phrase, i) => {
		searchTerms = searchTerms.replace(phrase, "");
		phrases[i] = phrase.replace(/^"(.*)"$/g, "$1");
	});

	let words = searchTerms.split(/\s+/);
	
	// build phrases from word combos
	let words2 = [];
	for ( let i=words.length;i>1;i--) {
		words2.push(words.slice(0,i).join(" ").trim());
	}

	// build final array and filter empty
	words = words.concat(words2).concat(phrases).filter( a => a.length );

	// sort largest to smallest to avoid small matches breaking larger matches
	words.sort( (a, b) => {return ( a.length > b.length ) ? -1 : 1} );
	
//	console.log(words);
	
	return words;
}

function mark(options) {
	
	addStyling();

	searchTerms = options.searchTerms.trim();
	
	window.findBarLastSearchTerms = searchTerms;

	CS_MARK_instance = CS_MARK_instance || new Mark(document.body);

	let words = options.separateWordSearch === false ? [searchTerms] : buildSearchWords(searchTerms);
	
	let _markOptions = { // object for Mark library, not the same as CS markOptions object
		accuracy: options.accuracy,
		ignorePunctuation: options.ignorePunctuation ? "?:;.,-–—‒_(){}[]!'\"+=".split("") : [],
		caseSensitive: options.caseSensitive,
		findBarSearch: options.findBarSearch
	}

	words.forEach( (word, i) => {
		
		let markMethod = CS_MARK_instance.mark;
		
		if ( /^\/.*\/[gimy]*$/.test(word) ) {
			// Create regex
			var flags = word.replace(/.*\/([gimy]*)$/, '$1');
			var pattern = word.replace(new RegExp('^/(.*?)/' + flags + '$'), '$1');
			var regex = new RegExp(pattern, flags);
			
			word = regex;
			
			markMethod = CS_MARK_instance.markRegExp;
		}

		markMethod(word, Object.assign({
			className:"CS_mark",
			acrossElements: false,
			separateWordSearch: false,

			each: (el) => {
				
				// add class to hidden makers for removal later
				if ( el.getBoundingClientRect().height === 0 || window.getComputedStyle(el, null).display === "none" )
					el.classList.add('CS_unmark');
				
				// add class to hits contained in other hits for removal later
				if ( el.parentNode.classList.contains('CS_mark') )
					el.classList.add('CS_unmark');	
				
				el.dataset.flashstyle = userOptions.highLight.highlightStyle;
			},
			
			done: () => {

				// only perform when done with all words
				if ( i !== words.length - 1 ) return;

				// remove marker queued for unmarking
				CS_MARK_instance.unmark({className: 'CS_unmark'});

				// get hit index in words array for styling
				document.querySelectorAll(".CS_mark").forEach( el => {
					let index = words.findIndex( _word => {
						return _word.toLowerCase() === el.textContent.toLowerCase();
					});
					
					if ( index === -1 ) index = 0; // regex
					
					el.dataset.style = index > 3 ? index % 4 : index;	
				});

				done();
			}
		}, _markOptions));
	});
	
	if ( words.length === 0 ) 
		done();
	
	function done() {
		
		// recursive loop fix
		delete options.action;
		delete options.searchTerms;

		browser.runtime.sendMessage(Object.assign({
			action: "markDone", 
			searchTerms:searchTerms, 
			words: words, 
		}, options));
	}
}

function unmark(saveTabHighlighting) {

	CS_MARK_instance = CS_MARK_instance || new Mark(document.body);
	CS_MARK_instance.unmark();
	
	closeNavBar();
	removeStyling();
	
	if ( !saveTabHighlighting )
		browser.runtime.sendMessage({action: "removeTabHighlighting"});
}

function openNavBar() {
	
	let hls = getMarks();

	if ( ! hls.length ) return;
	
	let ratio = document.documentElement.clientHeight / Math.max(document.documentElement.offsetHeight, document.body.offsetHeight);

	if ( getNavBar() ) { 
		setMarkers(getNavBar());
		return;
	}	

	let div = document.createElement('div');
	div.id = 'CS_highLightNavBar';
	
	let img = new Image();
	img.src = browser.runtime.getURL('icons/crossmark.svg');
	
	img.addEventListener('mousedown', (e) => {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	})
	img.addEventListener('mouseup', (e) => {	
		browser.runtime.sendMessage({action: "unmark"});
		closeNavBar();
	});
	
	div.appendChild(img);
	
	setMarkers(div);
	
	function navScrollToHandler(e) {
		document.documentElement.scrollTop = e.clientY / ratio - .5 * document.documentElement.clientHeight;
	}
	
	div.onclick = navScrollToHandler;
	
	div.addEventListener('mousedown', (e) => {
		
		e.preventDefault();
		
		function mouseMoveHandler(_e) {
			_e.preventDefault();
			navScrollToHandler(_e);
		}
		
		document.addEventListener('mousemove', mouseMoveHandler);
		
		document.addEventListener('mouseup', () => {
			document.removeEventListener('mousemove', mouseMoveHandler);
		}, {once:true});
	});

	document.body.appendChild(div);

	let n_width = parseFloat(window.getComputedStyle(div).getPropertyValue('width')) / window.devicePixelRatio;
	
	makeDockable(div, {
		handleElement: null,
		dockedPadding: {right:n_width},
		windowType: 'docked',
		offsetOnScroll: false,
		dockedPosition: 'right'
	});

	function setMarkers(navbar) {
		
		navbar.querySelectorAll('.marker').forEach( m => m.parentNode.removeChild(m) );

		// keep track of markers with the same top offset
		let layers = 0;

		hls.forEach( (hl, index) => {

			let marker = document.createElement('div');
			marker.className = 'marker';

			marker.style.top = offset(hl).top * ratio / document.documentElement.clientHeight * 100 + "vh";
			marker.style.height = '.5vh';//rect.height * ratio / document.documentElement.clientHeight * 100 + "vh";
			
			if ( hl.ownerDocument != document ) {
				let iframe = Array.from(document.querySelectorAll('iframe')).find( iframe => iframe.contentDocument == hl.ownerDocument );

				marker.style.top = offset(iframe).top * ratio / document.documentElement.clientHeight * 100 + "vh";
			}

			marker.dataset.style = hl.dataset.style || 0;
			
			marker.onclick = function(e) {
				
				e.stopImmediatePropagation();

				let _top = parseFloat(marker.style.top) / ratio;
				navScrollToHandler(e);

				jumpTo(index);
			}

			navbar.appendChild(marker);
			
			// if stacking elements, offset margins
			if ( marker.previousSibling && marker.previousSibling.style.top === marker.style.top )
				marker.style.marginTop = ++layers * 4 + 'px';
			else
				layers = 0;
			
			marker.style.background = userOptions.highLight.styles[parseInt(marker.dataset.style) || 0].background;
			marker.style.border = 'none';

		});
	}
}

function closeNavBar() {

	let nav = getNavBar();	
	
	if ( nav ) nav.parentNode.removeChild(nav);
}

function openFindBar() {
	
	return new Promise( (resolve, reject) => {

		let fb = getFindBar();

		if ( fb ) {
			setTimeout( () => {
				resolve(fb);
			}, 100);
			
			fb.style.opacity = null;
			fb.style.maxHeight = null;
			return;
		}
		
		let fbc = document.createElement('div');
		fbc.id = 'CS_findBarContainer';
		
		if ( userOptions.searchBarTheme === 'dark' )
			fbc.classList.add('CS_dark');
		
		fbc.style.transformOrigin = userOptions.highLight.findBar.position + " left";
		
		fbc.style.opacity = 0;
		fbc.style.maxHeight = '0px';
		if ( !userOptions.enableAnimations ) fbc.style.setProperty('--user-transition', 'none');

		fb = document.createElement('iframe');
		fb.id = 'CS_findBarIframe';

		let handle = new Image();
		handle.src = browser.runtime.getURL('icons/vertical.svg');
		handle.title = browser.i18n.getMessage("movedockundock");
		handle.className = "CS_handle";
		
		fbc.appendChild(handle);
		
		document.body.appendChild(fbc);
		fbc.appendChild(fb);
		
		fb.onload = function() {
			fb.focus();
			fbc.style.opacity = null;
			fbc.style.maxHeight = null;
			
			fbc.docking.init();
			resolve(fb);
		}

		fb.src = browser.runtime.getURL("/findbar.html");
		
		function saveFindBarOptions(o) {
			userOptions.highLight.findBar.offsets = o.lastOffsets;
			userOptions.highLight.findBar.position = o.dockedPosition;
			userOptions.highLight.findBar.windowType = o.windowType;
			
			browser.runtime.sendMessage({action: "saveUserOptions", userOptions:userOptions});
		}

		makeDockable(fbc, {
			handleElement:handle, 
			dockedPosition: userOptions.highLight.findBar.position,
			onDock: (o) => {
				saveFindBarOptions(o);	
			},
			onUndock: (o) => {
				saveFindBarOptions(o);
			},
			windowType: userOptions.highLight.findBar.windowType,
			lastOffsets: userOptions.highLight.findBar.offsets,
			dockedPosition: userOptions.highLight.findBar.position
		});
	});
}

function closeFindBar() {

	let fbc = getFindBarContainer();
	if ( fbc ) {
				
		fbc.style.maxHeight = '0px';
		fbc.style.opacity = 0;
		
		runAtTransitionEnd(fbc, "max-height", () => {
			fbc.parentNode.removeChild(fbc);
		});
	}
}

function nextPrevious(dir) {

	let marks = getMarks();

	let index = marks.findIndex(div => div.classList.contains("CS_mark_selected") );

	index += dir;
	
	if ( index < 0 ) index = marks.length - 1;
	if ( index >= marks.length ) index = 0;
	
	jumpTo(index);
}

function getMarks() {
	let marks = Array.from(document.querySelectorAll('.CS_mark'));
	document.querySelectorAll('iframe').forEach( iframe => {

		if ( ! iframe.contentDocument ) return;
		
		let iframeOffsetTop = offset(iframe).top;

		let _marks = Array.from(iframe.contentDocument.querySelectorAll('.CS_mark'));

		let index = marks.findIndex( mark => offset(mark).top > iframeOffsetTop );

		if ( index !== -1 )
			marks.splice(index, 0, ..._marks);
	});
	
	// if ( true || userOptions.highLight.sortByAccuracy ) {
		// marks.sort( (a,b) => { return a.textContent.toLowerCase() > b.textContent.toLowerCase() ? 1 : -1 } );
	// }

	return marks;
}

function jumpTo(index) {

	document.querySelectorAll('iframe').forEach( iframe => {
		
		if ( !iframe.contentDocument ) return;
		
		iframe.contentDocument.querySelectorAll('.CS_mark_selected').forEach( _div => _div.classList.remove('CS_mark_selected', 'CS_mark_flash') );
	});
	
	document.querySelectorAll('.CS_mark_selected').forEach( _div => {
		_div.classList.remove('CS_mark_selected', 'CS_mark_flash');
		
		if ( _div.classList.contains('marker') )
			_div.style.background = userOptions.highLight.styles[parseInt(_div.dataset.style) || 0].background;
		else
			_div.style.background = null;
	});
	
	let marks = getMarks();
	
	let mark = marks[index];
	
	if ( !mark ) return;

	mark.classList.add('CS_mark_selected');
	
	if ( userOptions.highLight.flashSelected )
		mark.classList.add('CS_mark_flash');
	
	let nav = getNavBar();
	if ( nav ) {
		let navdivs = nav.querySelectorAll('div');
		if ( navdivs[index] ) {
			navdivs[index].classList.add('CS_mark_selected');
			navdivs[index].style.background = 'var(--cs-mark-active-background)';
		}
	}

	if ( window.getComputedStyle(mark, null).display !== 'none' ) {
		
		let workingDocument = document;

		if ( mark.ownerDocument != document ) {

			for ( let iframe of document.querySelectorAll('iframe') ) {
				if (iframe.contentDocument == mark.ownerDocument) {
					document.documentElement.scrollTop = iframe.getBoundingClientRect().top + document.documentElement.scrollTop - .5 * document.documentElement.clientHeight;

					workingDocument = iframe.contentDocument;
					break;	
				}
			}
		}
			
		workingDocument.documentElement.scrollTop = mark.getBoundingClientRect().top + workingDocument.documentElement.scrollTop - .5 * workingDocument.documentElement.clientHeight;
	}
	
	if ( getFindBar() )
		updateFindBar({index: index, total: marks.length});
}

function updateFindBar(options) {
	
	// console.log(options);
	
	if ( window != top ) return;

	openFindBar().then( fb => {
		fb.contentWindow.postMessage(Object.assign({index: -1, total: 0, navbar: (getNavBar() ? true : false) }, options), browser.runtime.getURL('findbar.html'));	
	});
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if ( !message.action ) return;
	
	switch ( message.action ) {
		// case "openFindBar": // moved to separate listener
			// updateFindBar(Object.assign({index:-1, searchTerms: message.searchTerms || "", total: getMarks().length}, message));
			// break;
			
		case "closeFindBar":
			unmark();
			closeFindBar();
			break;
			
		case "updateFindBar":
			updateFindBar(message.options);
			break;
			
		case "findBarNext":
			nextPrevious(1);
			break;
		
		case "findBarPrevious":
			nextPrevious(-1);
			break;
			
		case "mark":
			unmark();
			mark(message);
			break;

		case "unmark":
			unmark(message.saveTabHighlighting || false);
			break;
			
		case "markDone":

			if ( 
				( userOptions.highLight.navBar.enabled && !message.findBarSearch ) ||
				( userOptions.highLight.findBar.showNavBar && message.findBarSearch )
			)
				openNavBar();

			if ( getFindBar() || ( userOptions.highLight.showFindBar && !message.findBarSearch ) || message.findBarSearch ) 
				updateFindBar(Object.assign({index:-1, total: getMarks().length}, message));

			if ( getFindBar() ) getFindBar().focus();

			if ( message.findBarSearch ) jumpTo(0);
			
			break;
			
		case "findBarUpdateOptions":
		//	console.log(message.markOptions);
			userOptions.highLight.findBar.markOptions = message.markOptions;
		//	if ( userOptions.highLight.findBar.saveOptions )
				browser.runtime.sendMessage({action: "saveUserOptions", userOptions: userOptions});
			break;
			
		case "toggleNavBar":
			if ( message.state === true ) openNavBar();
			else closeNavBar();
			break;
			
	}
});

document.addEventListener("fullscreenchange", (e) => {
	
	let fbc = getFindBarContainer();
	let navbar = getNavBar();

	if ( document.fullscreen ) {
		if (fbc) {
			fbc.style.display = 'none';
			
			if ( fbc.dataset.windowtype === 'docked' ) {
				fbc.lastWindowType = 'docked';
				fbc.undock();
			}
		}
		if (navbar) navbar.style.display = 'none';		
		
	} else {			
		if (fbc) {
			fbc.style.display = null;
			
			if ( fbc.lastWindowType === 'docked')
				fbc.docking.dock();
			
			delete fbc.lastWindowType;
		}
		if (navbar) navbar.style.display = null;
	}
});

document.addEventListener('zoom', (e) => {
	document.documentElement.style.setProperty('--cs-zoom', window.devicePixelRatio);
});
