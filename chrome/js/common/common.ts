/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

/// <reference path="common.d.ts" />
/// <reference path="../../../node_modules/@types/openpgp/index.d.ts" />

let openpgp = (window as FlowCryptWindow).openpgp;
let storage = (window as FlowCryptWindow).flowcrypt_storage;

// if(typeof exports === 'object') {
//   exports.tool = tool;
//   openpgp = require('openpgp');
//   storage = require('js/storage').legacy;
// }


let tool = window['tool'] = {
  str: {
    parse_email: (email_string) => {
      if(tool.value('<').in(email_string) && tool.value('>').in(email_string)) {
        return {
          email: email_string.substr(email_string.indexOf('<') + 1, email_string.indexOf('>') - email_string.indexOf('<') - 1).replace(/["']/g, '').trim().toLowerCase(),
          name: email_string.substr(0, email_string.indexOf('<')).replace(/["']/g, '').trim(),
          full: email_string,
        };
      }
      return {
        email: email_string.replace(/["']/g, '').trim().toLowerCase(),
        name: null,
        full: email_string,
      };
    },
    pretty_print: (obj) => (typeof obj === 'object') ? JSON.stringify(obj, null, 2).replace(/ /g, '&nbsp;').replace(/\n/g, '<br>') : String(obj),
    html_as_text: (html_text, callback) => {
      // extracts innerText from a html text in a safe way without executing any contained js
      // firefox does not preserve line breaks of iframe.contentDocument.body.innerText due to a bug - have to guess the newlines with regexes
      // this is still safe because Firefox does strip all other tags
      let br, block_start, block_end;
      if(tool.env.browser().name === 'firefox') {
        br = 'CU_BR_' + tool.str.random(5);
        block_start = 'CU_BS_' + tool.str.random(5);
        block_end = 'CU_BE_' + tool.str.random(5);
        html_text = html_text.replace(/<br[^>]*>/gi, br);
        html_text = html_text.replace(/<\/(p|h1|h2|h3|h4|h5|h6|ol|ul|pre|address|blockquote|dl|div|fieldset|form|hr|table)[^>]*>/gi, block_end);
        html_text = html_text.replace(/<(p|h1|h2|h3|h4|h5|h6|ol|ul|pre|address|blockquote|dl|div|fieldset|form|hr|table)[^>]*>/gi, block_start);
      }
      let e = document.createElement('iframe');
      // @ts-ignore
      e.sandbox = 'allow-same-origin';
      e.srcdoc = html_text;
      e.style['display'] = 'none';
      e.onload = function() {
        let text = e.contentDocument.body.innerText;
        if(tool.env.browser().name === 'firefox') {
          text = text.replace(RegExp('(' + block_start + ')+', 'g'), block_start).replace(RegExp('(' + block_end + ')+', 'g'), block_end);
          text = text.split(block_end + block_start).join(br).split(br + block_end).join(br);
          text = text.split(br).join('\n').split(block_start).filter(function(v){return !!v}).join('\n').split(block_end).filter(function(v){return !!v}).join('\n');
          text = text.replace(/\n{2,}/g, '\n\n');
        }
        callback(text.trim());
        document.body.removeChild(e);
      };
      document.body.appendChild(e);
    },
    normalize_spaces: (str) =>  str.replace(RegExp(String.fromCharCode(160), 'g'), String.fromCharCode(32)).replace(/\n /g, '\n'),
    number_format: (nStr) => { // http://stackoverflow.com/questions/3753483/javascript-thousand-separator-string-format
      nStr += '';
      let x = nStr.split('.');
      let x1 = x[0];
      let x2 = x.length > 1 ? '.' + x[1] : '';
      let rgx = /(\d+)(\d{3})/;
      while(rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
      }
      return x1 + x2;
    },
    is_email_valid: (email) => /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i.test(email),
    month_name: (month_index) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month_index],
    random: (length) => {
      let id = '';
      let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      for(let i = 0; i < (length || 5); i++) {
        id += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return id;
    },
    html_attribute_encode: (values) => tool._.str_base64url_utf_encode(JSON.stringify(values)),
    html_attribute_decode: (encoded) => JSON.parse(tool._.str_base64url_utf_decode(encoded)),
    html_escape: (str) => str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\//g, '&#x2F;'), // http://stackoverflow.com/questions/1219860/html-encoding-lost-when-attribute-read-from-input-field
    html_unescape: (str) => str.replace(/&#x2F;/g, '/').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
    as_safe_html: (text_or_html, callback) => {
      let nl = '_cryptup_newline_placeholder_' + tool.str.random(3) + '_';
      tool.str.html_as_text(text_or_html.replace(/<br ?\/?> ?\r?\n/gm, nl).replace(/\r?\n/gm, nl).replace(/</g, '&lt;').replace(RegExp(nl, 'g'), '<br>'), function(plain) {
        callback(plain.trim().replace(/</g, '&lt;').replace(/\n/g, '<br>').replace(/ {2,}/g, function (spaces) {
          return '&nbsp;'.repeat(spaces.length);
        }));
      });
    },
    base64url_encode: (str) => (typeof str === 'undefined') ? str : btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), // used for 3rd party API calls - do not change w/o testing Gmail api attachments
    base64url_decode: (str) => (typeof str === 'undefined') ? str : atob(str.replace(/-/g, '+').replace(/_/g, '/')), // used for 3rd party API calls - do not change w/o testing Gmail api attachments
    from_uint8: (u8a) =>{
      let CHUNK_SZ = 0x8000;
      let c = [];
      for(let i = 0; i < u8a.length; i += CHUNK_SZ) {
        c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)));
      }
      return c.join('');
    },
    to_uint8: (raw) => {
      let rawLength = raw.length;
      let uint8 = new Uint8Array(new ArrayBuffer(rawLength));
      for(let i = 0; i < rawLength; i++) {
        uint8[i] = raw.charCodeAt(i);
      }
      return uint8;
    },
    from_equal_sign_notation_as_utf: (str) => {
      return str.replace(/(=[A-F0-9]{2})+/g, function (equal_sign_utf_part) {
        return tool.str.uint8_as_utf(equal_sign_utf_part.replace(/^=/, '').split('=').map(function (two_hex_digits) { return parseInt(two_hex_digits, 16); }));
      });
    },
    uint8_as_utf: (a) => { //tom
      let length = a.length;
      let bytes_left_in_char = 0;
      let utf8_string = '';
      let binary_char = '';
      for(let i = 0; i < length; i++) {
        if(a[i] < 128) {
          if(bytes_left_in_char) { // utf-8 continuation byte missing, assuming the last character was an 8-bit ASCII character
            utf8_string += String.fromCharCode(a[i-1]);
          }
          bytes_left_in_char = 0;
          binary_char = '';
          utf8_string += String.fromCharCode(a[i]);
        } else {
          if(!bytes_left_in_char) { // beginning of new multi-byte character
            if(a[i] >= 128 && a[i] < 192) { //10xx xxxx
              utf8_string += String.fromCharCode(a[i]); // extended 8-bit ASCII compatibility, european ASCII characters
            } else if(a[i] >= 192 && a[i] < 224) { //110x xxxx
              bytes_left_in_char = 1;
              binary_char = a[i].toString(2).substr(3);
            } else if(a[i] >= 224 && a[i] < 240) { //1110 xxxx
              bytes_left_in_char = 2;
              binary_char = a[i].toString(2).substr(4);
            } else if(a[i] >= 240 && a[i] < 248) { //1111 0xxx
              bytes_left_in_char = 3;
              binary_char = a[i].toString(2).substr(5);
            } else if(a[i] >= 248 && a[i] < 252) { //1111 10xx
              bytes_left_in_char = 4;
              binary_char = a[i].toString(2).substr(6);
            } else if(a[i] >= 252 && a[i] < 254) { //1111 110x
              bytes_left_in_char = 5;
              binary_char = a[i].toString(2).substr(7);
            } else {
              console.log('tool.str.uint8_as_utf: invalid utf-8 character beginning byte: ' + a[i]);
            }
          } else { // continuation of a multi-byte character
            binary_char += a[i].toString(2).substr(2);
            bytes_left_in_char--;
          }
          if(binary_char && !bytes_left_in_char) {
            utf8_string += String.fromCharCode(parseInt(binary_char, 2));
            binary_char = '';
          }
        }
      }
      return utf8_string;
    },
    to_hex: (s) => { // http://phpjs.org/functions/bin2hex/, Kevin van Zonneveld (http://kevin.vanzonneveld.net), Onno Marsman, Linuxworld, ntoniazzi
      let i, l, o = '', n;
      s += '';
      for(i = 0, l = s.length; i < l; i++) {
        n = s.charCodeAt(i).toString(16);
        o += n.length < 2 ? '0' + n : n;
      }
      return o;
    },
    from_hex: (hex) => {
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        let v = parseInt(hex.substr(i, 2), 16);
        if (v) str += String.fromCharCode(v);
      }
      return str;
    },
    extract_cryptup_attachments: (decrypted_content, cryptup_attachments) => {
      if(tool.value('cryptup_file').in(decrypted_content)) {
        decrypted_content = decrypted_content.replace(/<a[^>]+class="cryptup_file"[^>]+>[^<]+<\/a>/g, function (found_link) {
          let element = $(found_link);
          let attachment_data = tool.str.html_attribute_decode(element.attr('cryptup-data'));
          cryptup_attachments.push(tool.file.attachment(attachment_data.name, attachment_data.type, null, attachment_data.size, element.attr('href')));
          return '';
        });
      }
      return decrypted_content;
    },
    extract_cryptup_reply_token: (decrypted_content) => {
      let cryptup_token_element = $(tool.e('div', {html: decrypted_content})).find('.cryptup_reply');
      if(cryptup_token_element.length && cryptup_token_element.attr('cryptup-data')) {
        return tool.str.html_attribute_decode(cryptup_token_element.attr('cryptup-data'));
      }
    },
    strip_cryptup_reply_token: (decrypted_content) => decrypted_content.replace(/<div[^>]+class="cryptup_reply"[^>]+><\/div>/, ''),
    strip_public_keys: (decrypted_content, found_public_keys) => {
      tool.each(tool.crypto.armor.detect_blocks(decrypted_content), function(i, block) {
        if(block.type === 'public_key') {
          found_public_keys.push(block.content);
          decrypted_content = decrypted_content.replace(block.content, '');
        }
      });
      return decrypted_content;
    },
    int_to_hex: (int_as_string) => { // http://stackoverflow.com/questions/18626844/convert-a-large-integer-to-a-hex-string-in-javascript (Collin Anderson)
      let dec = int_as_string.toString().split(''), sum = [], hex = [], i, s;
      while(dec.length){
        s = 1 * dec.shift();
        for(i = 0; s || i < sum.length; i++){
          s += (sum[i] || 0) * 10;
          sum[i] = s % 16;
          s = (s - sum[i]) / 16
        }
      }
      while(sum.length){
        hex.push(sum.pop().toString(16))
      }
      return hex.join('')
    },
    capitalize: (string) => {
      return string.trim().split(' ').map(function(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
      }).join(' ');
    },
  },
  env: {
    browser: () => {  // http://stackoverflow.com/questions/4825498/how-can-i-find-out-which-browser-a-user-is-using
      if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        return {name: 'firefox', v: Number(RegExp.$1)};
      } else if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
        return {name: 'ie', v: Number(RegExp.$1)};
      } else if (/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        return {name: 'chrome', v: Number(RegExp.$1)};
      } else if (/Opera[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        return {name: 'opera', v: Number(RegExp.$1)};
      } else if (/Safari[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        return {name: 'safari', v: Number(RegExp.$1)};
      } else {
        return {name: 'unknown', v: null};
      }
    },
    runtime_id: (original=false) => {
      if(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        if(original === true) {
          return chrome.runtime.id;
        } else {
          return chrome.runtime.id.replace(/[^a-z0-9]/gi, '');
        }
      }
      return null;
    },
    is_background_script: () => Boolean(window.location && tool.value('_generated_background_page.html').in(window.location.href)),
    is_extension: () => tool.env.runtime_id() !== null,
    url_params: (expected_keys, string) => {
      let raw_url_data = (string || window.location.search.replace('?', '')).split('&');
      let url_data = {};
      tool.each(raw_url_data, function (i, pair_string) {
        let pair = pair_string.split('=');
        if(tool.value(pair[0]).in(expected_keys)) {
          url_data[pair[0]] = typeof tool._.var.env_url_param_DICT[pair[1]] !== 'undefined' ? tool._.var.env_url_param_DICT[pair[1]] : decodeURIComponent(pair[1]);
        }
      });
      return url_data;
    },
    url_create: (link, params) => {
      tool.each(params, function(key, value) {
        if(typeof value !== 'undefined') {
          let transformed = tool.obj.key_by_value(tool._.var.env_url_param_DICT, value);
          link += (!tool.value('?').in(link) ? '?' : '&') + key + '=' + encodeURIComponent(typeof transformed !== 'undefined' ? transformed : value);
        }
      });
      return link;
    },
    key_codes: () => ({ a: 97, r: 114, A: 65, R: 82, f: 102, F: 70, backspace: 8, tab: 9, enter: 13, comma: 188, }),
    set_up_require: () => {
      // @ts-ignore
      require.config({
        baseUrl: '/lib',
        paths: {
          'emailjs-addressparser': './emailjs/emailjs-addressparser',
          'emailjs-mime-builder': './emailjs/emailjs-mime-builder',
          'emailjs-mime-codec': './emailjs/emailjs-mime-codec',
          'emailjs-mime-parser': './emailjs/emailjs-mime-parser',
          'emailjs-mime-types': './emailjs/emailjs-mime-types',
          'emailjs-stringencoding': './emailjs/emailjs-stringencoding',
          'punycode': './emailjs/punycode',
        }
      });
    },
    webmails: (cb) => {
      cb(['gmail', 'inbox']);
    },
  },
  arr: {
    unique: (array) => {
      let unique = [];
      tool.each(array, function (i, v) {
        if(!tool.value(v).in(unique)) {
          unique.push(v);
        }
      });
      return unique;
    },
    from_dome_node_list: (obj) => { // http://stackoverflow.com/questions/2735067/how-to-convert-a-dom-node-list-to-an-array-in-javascript
      let array = [];
      for(let i = obj.length >>> 0; i--;) { // iterate backwards ensuring that length is an UInt32
        array[i] = obj[i];
      }
      return array;
    },
    without_key: (array, i) => array.splice(0, i).concat(array.splice(i + 1, array.length)),
    without_value: (array, without_value) => {
      let result = [];
      tool.each(array, function (i, value) {
        if(value !== without_value) {
          result.push(value);
        }
      });
      return result;
    },
    select: (array, mapped_object_key) => {
      return array.map(function(obj) {
        return obj[mapped_object_key];
      });
    },
    contains: (arr, value) => {
      return arr && typeof arr.indexOf === 'function' && arr.indexOf(value) !== -1;
    },
    sum: (arr) => arr.reduce(function(a, b) { return a + b; }, 0),
    average: (arr) => tool.arr.sum(arr) / arr.length,
    zeroes: (length) => new Array(length).map(function() { return 0 }),
    is: (object_to_identify) => Object.prototype.toString.call(object_to_identify) === '[object Array]', // http://stackoverflow.com/questions/4775722/check-if-object-is-array
  },
  obj: {
    map: (original_obj, f) => {
      let mapped = {};
      tool.each(original_obj, function(k, v) {
        mapped[k] = f(v);
      });
      return mapped;
    },
    key_by_value: (obj, v) => {
      for(let k in obj) {
        if(obj.hasOwnProperty(k) && obj[k] === v) {
          return k;
        }
      }
    },
  },
  int: {
    random: (min_value, max_value) => min_value + Math.round(Math.random() * (max_value - min_value)),
  },
  time: {
    wait: (until_this_function_evaluates_true) => {
      return tool.catch.Promise(function (success, error) {
        let interval = setInterval(function () {
          let result = until_this_function_evaluates_true();
          if(result === true) {
            clearInterval(interval);
            if(success) {
              success();
            }
          } else if(result === false) {
            clearInterval(interval);
            if(error) {
              error();
            }
          }
        }, 50);
      });
    },
    get_future_timestamp_in_months: (months_to_add) => new Date().getTime() + 1000 * 3600 * 24 * 30 * months_to_add,
    hours: (h) =>  h * 1000 * 60 * 60, // hours in miliseconds
    expiration_format: (date) => tool.str.html_escape(date.substr(0, 10)),
    to_utc_timestamp: (datetime_string, as_string) => as_string ? String(Date.parse(datetime_string)) : Date.parse(datetime_string),
  },
  file: {
    object_url_create: (content) => window.URL.createObjectURL(new Blob([content], { type: 'application/octet-stream' })),
    object_url_consume: (url) => {
      return tool.catch.Promise(function(resolve, reject) {
        tool.file.download_as_uint8(url, null, function (success, uint8) {
          window.URL.revokeObjectURL(url);
          if(success) {
            resolve(uint8);
          } else {
            reject({error: 'could not consume object url', detail: url});
          }
        });
      });
    },
    download_as_uint8: (url, progress, callback) => {
      let request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';
      if(typeof progress === 'function') {
        request.onprogress = function (evt) {
          progress(evt.lengthComputable ? Math.floor((evt.loaded / evt.total) * 100) : null, evt.loaded, evt.total);
        };
      }
      request.onerror = function (e) {
        callback(false, e);
      };
      request.onload = function (e) {
        callback(true, new Uint8Array(request.response));
      };
      request.send();
    },
    save_to_downloads: (name, type, content, render_in) => {
      let blob = new Blob([content], { type: type });
      if(window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, name);
      } else {
        let a = window.document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = name;
        if(render_in) {
          a.textContent = 'DECRYPTED FILE';
          // @ts-ignore
          a.style = 'font-size: 16px; font-weight: bold;';
          render_in.html('<div style="font-size: 16px;padding: 17px 0;">File is ready.<br>Right-click the link and select <b>Save Link As</b></div>');
          render_in.append(a);
          render_in.css('height', 'auto');
          render_in.find('a').click(function (e) {
            alert('Please use right-click and select Save Link As');
            e.preventDefault();
            e.stopPropagation();
            return false;
          });
        } else {
          if(typeof a.click === 'function') {
            a.click();
          } else { // safari
            let e = document.createEvent('MouseEvents');
            // @ts-ignore
            e.initMouseEvent('click', true, true, window);
            a.dispatchEvent(e);
          }
          if(tool.env.browser().name === 'firefox') {
            try {
              document.body.removeChild(a);
            } catch(err) {
              if(err.message !== 'Node was not found') {
                throw err;
              }
            }
          }
          setTimeout(function () {
            window.URL.revokeObjectURL(a.href);
          }, 0);
        }
      }
    },
    attachment: (name='', type='application/octet-stream', content, size=content.length, url=null) => { // todo - refactor as (content, name, type, LENGTH, url), making all but content voluntary
      // todo: accept any type of content, then add getters for content(str, uint8, blob) and fetch(), also size('formatted')
      return {name: name, type: type, content: content, size: size, url: url};
    },
    pgp_name_patterns: () => ['*.pgp', '*.gpg', '*.asc', 'noname', 'message', 'PGPMIME version identification', ''],
    keyinfo_as_pubkey_attachment: (ki) => tool.file.attachment('0x' + ki.longid + '.asc', 'application/pgp-keys', ki.public),
    treat_as: (attachment) => {
      if(tool.value(attachment.name).in(['PGPexch.htm.pgp', 'PGPMIME version identification'])) {
        return 'hidden';  // PGPexch.htm.pgp is html alternative of textual body content produced by PGP Desktop and GPG4o
      } else if(attachment.name === 'signature.asc' || attachment.type === 'application/pgp-signature') {
        return  'signature';
      } else if(!attachment.name && !tool.value('image/').in(attachment.type)) { // attachment.name may be '' or undefined - catch either
        return attachment.size < 100 ? 'hidden' : 'message';
      } else if(tool.value(attachment.name).in(['message', 'message.asc', 'encrypted.asc', 'encrypted.eml.pgp'])) {
        return 'message';
      } else if(attachment.name.match(/(\.pgp$)|(\.gpg$)|(\.[a-zA-Z0-9]{3,4}\.asc$)/g)) { // ends with one of .gpg, .pgp, .???.asc, .????.asc
        return 'encrypted';
      } else if(attachment.name.match(/^(0|0x)?[A-F0-9]{8}([A-F0-9]{8})?\.asc$/g)) { // name starts with a key id
        return 'public_key';
      } else if(tool.value('public').in(attachment.name.toLowerCase()) && attachment.name.match(/[A-F0-9]{8}.*\.asc$/g)) { // name contains the word "public", any key id and ends with .asc
        return 'public_key';
      } else if(attachment.name.match(/\.asc$/) && attachment.size < 100000 && !attachment.inline) {
        return 'message';
      } else {
        return 'standard';
      }
    },
  },
  mime: {
    process: (mime_message, callback) => {
      tool.mime.decode(mime_message, function (success, decoded) {
        // @ts-ignore
        if(typeof decoded.text === 'undefined' && typeof decoded.html !== 'undefined' && typeof $_HOST_html_to_text === 'function') { // android
          // @ts-ignore
          decoded.text = $_HOST_html_to_text(decoded.html); // temporary solution
        }
        let blocks = [];
        if(decoded.text) {  // may be undefined or empty
          blocks = blocks.concat(tool.crypto.armor.detect_blocks(decoded.text));
        }
        tool.each(decoded.attachments, function(i, file) {
          let treat_as = tool.file.treat_as(file);
          if(treat_as === 'message') {
            let armored = tool.crypto.armor.clip(file.content);
            if(armored) {
              blocks.push(tool._.crypto_armor_block_object('message', armored));
            }
          } else if(treat_as === 'signature') {
            decoded.signature = decoded.signature || file.content;
          } else if(treat_as === 'public_key') {
            blocks = blocks.concat(tool.crypto.armor.detect_blocks(file.content));
          }
        });
        if(decoded.signature) {
          tool.each(blocks, function(i, block) {
            if(block.type === 'text') {
              block.type = 'signed_message';
              block.signature = decoded.signature;
              return false;
            }
          });
        }
        callback({headers: decoded.headers, blocks: blocks});
      });
    },
    headers_to_from: (parsed_mime_message) => {
      let header_to = [];
      let header_from;
      if(parsed_mime_message.headers.from && parsed_mime_message.headers.from.length && parsed_mime_message.headers.from[0] && parsed_mime_message.headers.from[0].address) {
        header_from = parsed_mime_message.headers.from[0].address;
      }
      if(parsed_mime_message.headers.to && parsed_mime_message.headers.to.length) {
        tool.each(parsed_mime_message.headers.to, function (i, to) {
          if(to.address) {
            header_to.push(to.address);
          }
        });
      }
      return { from: header_from, to: header_to };
    },
    reply_headers: (parsed_mime_message) => {
      let message_id = parsed_mime_message.headers['message-id'] || '';
      let references = parsed_mime_message.headers['in-reply-to'] || '';
      return { 'in-reply-to': message_id, 'references': references + ' ' + message_id };
    },
    resembles_message: (message) => {
      let m = message.slice(0, 1000);
      if(m instanceof  Uint8Array) {
        m = tool.str.from_uint8(m);
      }
      m = m.toLowerCase();
      let contentType = m.match(/content-type: +[0-9a-z\-\/]+/);
      if(contentType === null) {
        return false;
      }
      if(m.match(/content-transfer-encoding: +[0-9a-z\-\/]+/) || m.match(/content-disposition: +[0-9a-z\-\/]+/) || m.match(/; boundary=/) || m.match(/; charset=/)) {
        return true;
      }
      return Boolean(contentType.index === 0 && m.match(/boundary=/));
    },
    format_content_to_display: (text, full_mime_message) => {
      // todo - this function is very confusing, and should be split into two:
      // ---> format_mime_plaintext_to_display(text, charset)
      // ---> get_charset(full_mime_message)
      if(/<((br)|(div)|p) ?\/?>/.test(text)) {
        return text;
      }
      text = (text || '').replace(/\r?\n/g, '<br>\n');
      if(text && full_mime_message && full_mime_message.match(/^Charset: iso-8859-2/m) !== null) {
        return (window as FlowCryptWindow).iso88592.decode(text);
      }
      return text;
    },
    decode: (mime_message, callback) => {
      let mime_message_contents = {attachments: [], headers: {}, text: undefined, html: undefined, signature: undefined};
      tool._.mime_require('parser', function (emailjs_mime_parser) {
        try {
          let parser = new emailjs_mime_parser();
          let parsed = {};
          parser.onheader = function (node) {
            if(!String(node.path.join('.'))) { // root node headers
              tool.each(node.headers, function (name, header) {
                mime_message_contents.headers[name] = header[0].value;
              });
            }
          };
          parser.onbody = function (node, chunk) {
            let path = String(node.path.join('.'));
            if(typeof parsed[path] === 'undefined') {
              parsed[path] = node;
            }
          };
          parser.onend = function () {
            tool.each(parsed, function (path, node) {
              if(tool._.mime_node_type(node) === 'application/pgp-signature') {
                mime_message_contents.signature = node.rawContent;
              } else if(tool._.mime_node_type(node) === 'text/html' && !tool._.mime_node_filename(node)) {
                mime_message_contents.html = node.rawContent;
              } else if(tool._.mime_node_type(node) === 'text/plain' && !tool._.mime_node_filename(node)) {
                mime_message_contents.text = node.rawContent;
              } else {
                let node_content = tool.str.from_uint8(node.content);
                mime_message_contents.attachments.push(tool.file.attachment(tool._.mime_node_filename(node), tool._.mime_node_type(node), node_content));
              }
            });
            tool.catch.try(function () {
              callback(true, mime_message_contents);
            })();
          };
          parser.write(mime_message); //todo - better chunk it for very big messages containing attachments? research
          parser.end();
        } catch(e) {
          tool.catch.handle_exception(e);
          tool.catch.try(function () {
            callback(false, mime_message_contents);
          })();
        }
      });
    },
    encode: (body:string|{'text/plain': string,'text/html'?: string}, headers: {To: string[], From: string, Subject: string}, attachments: {name: string, type: string, content:Uint8Array}[], mime_message_callback) => {
      tool._.mime_require('builder', function (MimeBuilder) {
        let root_node = new MimeBuilder('multipart/mixed');
        tool.each(headers, function (key, header) {
          root_node.addHeader(key, header);
        });
        if(typeof body === 'string') {
          body = {'text/plain': body};
        }
        let content_node;
        if(Object.keys(body).length === 1) {
          content_node = tool._.mime_content_node(MimeBuilder, Object.keys(body)[0], body[Object.keys(body)[0]]);
        } else {
          content_node = new MimeBuilder('multipart/alternative');
          tool.each(body, function (type, content) {
            content_node.appendChild(tool._.mime_content_node(MimeBuilder, type, content));
          });
        }
        root_node.appendChild(content_node);
        tool.each(attachments || [], function (i, attachment) {
          root_node.appendChild(new MimeBuilder(attachment.type + '; name="' + attachment.name + '"', { filename: attachment.name }).setHeader({
            'Content-Disposition': 'attachment',
            'X-Attachment-Id': 'f_' + tool.str.random(10),
            'Content-Transfer-Encoding': 'base64',
          }).setContent(attachment.content));
        });
        mime_message_callback(root_node.build());
      });
    },
    signed: (mime_message) => {
      /*
        Trying to grab the full signed content that may look like this in its entirety (it's a signed mime message. May also be signed plain text)
        Unfortunately, emailjs-mime-parser was not able to do this, or I wasn't able to use it properly
  
        --eSmP07Gus5SkSc9vNmF4C0AutMibfplSQ
        Content-Type: multipart/mixed; boundary="XKKJ27hlkua53SDqH7d1IqvElFHJROQA1"
        From: Henry Electrum <henry.electrum@gmail.com>
        To: human@flowcrypt.com
        Message-ID: <abd68ba1-35c3-ee8a-0d60-0319c608d56b@gmail.com>
        Subject: compatibility - simples signed email
  
        --XKKJ27hlkua53SDqH7d1IqvElFHJROQA1
        Content-Type: text/plain; charset=utf-8
        Content-Transfer-Encoding: quoted-printable
  
        content
  
        --XKKJ27hlkua53SDqH7d1IqvElFHJROQA1--
        */
      let signed_header_index = mime_message.substr(0, 100000).toLowerCase().indexOf('content-type: multipart/signed');
      if(signed_header_index !== -1) {
        mime_message = mime_message.substr(signed_header_index);
        let first_boundary_index = mime_message.substr(0, 1000).toLowerCase().indexOf('boundary=');
        if(first_boundary_index) {
          let boundary = mime_message.substr(first_boundary_index, 100);
          boundary = (boundary.match(/boundary="[^"]{1,70}"/gi) || boundary.match(/boundary=[a-z0-9][a-z0-9 ]{0,68}[a-z0-9]/gi) || [])[0];
          if(boundary) {
            boundary = boundary.replace(/^boundary="?|"$/gi, '');
            let boundary_begin = '\r\n--' + boundary + '\r\n';
            let boundary_end = '--' + boundary + '--';
            let end_index = mime_message.indexOf(boundary_end);
            if(end_index !== -1) {
              mime_message = mime_message.substr(0, end_index + boundary_end.length);
              if(mime_message) {
                let result = { full: mime_message, signed: null, signature: null };
                let first_part_start_index = mime_message.indexOf(boundary_begin);
                if(first_part_start_index !== -1) {
                  first_part_start_index += boundary_begin.length;
                  let first_part_end_index = mime_message.indexOf(boundary_begin, first_part_start_index);
                  let second_part_start_index = first_part_end_index + boundary_begin.length;
                  let second_part_end_index = mime_message.indexOf(boundary_end, second_part_start_index);
                  if(second_part_end_index !== -1) {
                    let first_part = mime_message.substr(first_part_start_index, first_part_end_index - first_part_start_index);
                    let second_part = mime_message.substr(second_part_start_index, second_part_end_index - second_part_start_index);
                    if(first_part.match(/^content-type: application\/pgp-signature/gi) !== null && tool.value('-----BEGIN PGP SIGNATURE-----').in(first_part) && tool.value('-----END PGP SIGNATURE-----').in(first_part)) {
                      result.signature = tool.crypto.armor.clip(first_part);
                      result.signed = second_part;
                    } else {
                      result.signature = tool.crypto.armor.clip(second_part);
                      result.signed = first_part;
                    }
                    return result;
                  }
                }
              }
            }
          }
        }
      }
    },
  },
  ui: {
    spinner: (color, placeholder_class:"small_spinner"|"large_spinner"='small_spinner') => {
      let path = '/img/svgs/spinner-' + color + '-small.svg';
      let url = typeof chrome !== 'undefined' && chrome.extension && chrome.extension.getURL ? chrome.extension.getURL(path) : path;
      return `<i class="${placeholder_class}"><img src="${url}" /></i>`;
    },
    passphrase_toggle: (pass_phrase_input_ids, force_initial_show_or_hide) => {
      let button_hide = '<img src="/img/svgs/eyeclosed-icon.svg" class="eye-closed"><br>hide';
      let button_show = '<img src="/img/svgs/eyeopen-icon.svg" class="eye-open"><br>show';
      storage.get(null, ['hide_pass_phrases'], function (s) {
        let show;
        if(force_initial_show_or_hide === 'hide') {
          show = false;
        } else if(force_initial_show_or_hide === 'show') {
          show = true;
        } else {
          show = !s.hide_pass_phrases;
        }
        tool.each(pass_phrase_input_ids, function (i, id) {
          $('#' + id).addClass('toggled_passphrase');
          if(show) {
            $('#' + id).after('<label href="#" id="toggle_' + id + '" class="toggle_show_hide_pass_phrase" for="' + id + '">' + button_hide + '</label>');
            $('#' + id).attr('type', 'text');
          } else {
            $('#' + id).after('<label href="#" id="toggle_' + id + '" class="toggle_show_hide_pass_phrase" for="' + id + '">' + button_show + '</label>');
            $('#' + id).attr('type', 'password');
          }
          $('#toggle_' + id).click(function () {
            if($('#' + id).attr('type') === 'password') {
              $('#' + id).attr('type', 'text');
              $(this).html(button_hide);
              storage.set(null, { hide_pass_phrases: false });
            } else {
              $('#' + id).attr('type', 'password');
              $(this).html(button_show);
              storage.set(null, { hide_pass_phrases: true });
            }
          });
        });
      });
    },
    enter: (callback) => {
      return function(e) {
        if (e.which == tool.env.key_codes().enter) {
          callback();
        }
      };
    },
    build_jquery_selectors: (selectors) => {
      let cache = {};
      return {
        cached: function(name) {
          if(!cache[name]) {
            if(typeof selectors[name] === 'undefined') {
              tool.catch.report('unknown selector name: ' + name);
            }
            cache[name] = $(selectors[name]);
          }
          return cache[name];
        },
        now: function(name) {
          if(typeof selectors[name] === 'undefined') {
            tool.catch.report('unknown selector name: ' + name);
          }
          return $(selectors[name]);
        },
        selector: function (name) {
          if(typeof selectors[name] === 'undefined') {
            tool.catch.report('unknown selector name: ' + name);
          }
          return selectors[name];
        }
      };
    },
    scroll: (selector, repeat) => {
      let el = $(selector).first()[0];
      if(el) {
        el.scrollIntoView();
        tool.each(repeat, function(i, delay) { // useful if mobile keyboard is about to show up
          setTimeout(function() {
            el.scrollIntoView();
          }, delay);
        });
      }
    },
    event: {
      stop: () => {
        return function(e) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        };
      },
      protect: () => {
        // prevent events that could potentially leak information about sensitive info from bubbling above the frame
        $('body').on('keyup keypress keydown click drag drop dragover dragleave dragend submit', function(e) {
          // don't ask me how come Chrome allows it to bubble cross-domain
          // should be used in embedded frames where the parent cannot be trusted (eg parent is webmail)
          // should be further combined with iframe type=content + sandboxing, but these could potentially be changed by the parent frame
          // so this indeed seems like the only defense
          // happened on only one machine, but could potentially happen to other users as well
          // if you know more than I do about the hows and whys of events bubbling out of iframes on different domains, let me know
          e.stopPropagation();
        });
      },
      double: () => ({ name: 'double', id: tool.str.random(10) }),
      parallel: () => ({ name: 'parallel', id: tool.str.random(10) }),
      spree: (type='') => ({ name: `${type}spree`, id: tool.str.random(10) }),
      prevent: (meta, callback) => { //todo: messy + needs refactoring
        return function () {
          if(meta.name === 'spree') {
            clearTimeout(tool._.var.ui_event_fired[meta.id]);
            tool._.var.ui_event_fired[meta.id] = setTimeout(callback, tool._.var.ui_event_SPREE_MS);
          } else if(meta.name === 'slowspree') {
            clearTimeout(tool._.var.ui_event_fired[meta.id]);
            tool._.var.ui_event_fired[meta.id] = setTimeout(callback, tool._.var.ui_event_SLOW_SPREE_MS);
          } else if(meta.name === 'veryslowspree') {
            clearTimeout(tool._.var.ui_event_fired[meta.id]);
            tool._.var.ui_event_fired[meta.id] = setTimeout(callback, tool._.var.ui_event_VERY_SLOW_SPREE_MS);
          } else {
            if(meta.id in tool._.var.ui_event_fired) {
              // if(meta.name === 'parallel') - id was found - means the event handling is still being processed. Do not call back
              if(meta.name === 'double') {
                if(Date.now() - tool._.var.ui_event_fired[meta.id] > tool._.var.ui_event_DOUBLE_MS) {
                  tool._.var.ui_event_fired[meta.id] = Date.now();
                  callback(this, meta.id);
                }
              }
            } else {
              tool._.var.ui_event_fired[meta.id] = Date.now();
              callback(this, meta.id);
            }
          }
        };
      },
      release: (id) => { // todo - I may have forgot to use this somewhere, used only parallel() - if that's how it works
        if(id in tool._.var.ui_event_fired) {
          let ms_to_release = tool._.var.ui_event_DOUBLE_MS + tool._.var.ui_event_fired[id] - Date.now();
          if(ms_to_release > 0) {
            setTimeout(function () {
              delete tool._.var.ui_event_fired[id];
            }, ms_to_release);
          } else {
            delete tool._.var.ui_event_fired[id];
          }
        }
      },
    },
  },
  browser: {
    message: {
      cb: '[***|callback_placeholder|***]',
      bg_exec: (path, args, callback) => {
        args = args.map(function (arg) {
          if((typeof arg === 'string' && arg.length > tool._.var.browser_message_MAX_SIZE) || arg instanceof Uint8Array) {
            return tool.file.object_url_create(arg);
          } else {
            return arg;
          }
        });
        tool.browser.message.send(null, 'bg_exec', {path: path, args: args}, function (result) {
          if(path === 'tool.crypto.message.decrypt') {
            if(result && result.success && result.content && result.content.data && typeof result.content.data === 'string' && result.content.data.indexOf('blob:' + chrome.runtime.getURL('')) === 0) {
              tool.file.object_url_consume(result.content.data).then(function (result_content_data) {
                result.content.data = result_content_data;
                callback(result);
              });
            } else {
              callback(result);
            }
          } else {
            callback(result);
          }
        });
      },
      send: (destination_string, name, data, callback) => {
        let msg = { name: name, data: data, to: destination_string || null, respondable: !!(callback), uid: tool.str.random(10), stack: tool.catch.stack_trace() };
        let is_background_page = tool.env.is_background_script();
        if(typeof  destination_string === 'undefined') { // don't know where to send the message
          tool.catch.log('tool.browser.message.send to:undefined');
          if(typeof callback !== 'undefined') {
            callback();
          }
        } else if (is_background_page && tool._.var.browser_message_background_script_registered_handlers && msg.to === null) {
          tool._.var.browser_message_background_script_registered_handlers[msg.name](msg.data, 'background', callback); // calling from background script to background script: skip messaging completely
        } else if(is_background_page) {
          chrome.tabs.sendMessage(tool._.browser_message_destination_parse(msg.to).tab, msg, undefined, function(r) {
            tool.catch.try(function() {
              if(typeof callback !== 'undefined') {
                callback(r);
              }
            })();
          });
        } else {
          chrome.runtime.sendMessage(msg, function(r) {
            tool.catch.try(function() {
              if(typeof callback !== 'undefined') {
                callback(r);
              }
            })();
          });
        }
      },
      tab_id: (callback) => tool.browser.message.send(null, '_tab_', null, callback),
      listen: (handlers, listen_for_tab_id) => {
        tool.each(handlers, function(name, handler) {
          // newly registered handlers with the same name will overwrite the old ones if tool.browser.message.listen is declared twice for the same frame
          // original handlers not mentioned in newly set handlers will continue to work
          tool._.var.browser_message_frame_registered_handlers[name] = handler;
        });
        tool.each(tool._.var.browser_message_STANDARD_HANDLERS, function(name, handler) {
          if(tool._.var.browser_message_frame_registered_handlers[name] !== 'function') {
            tool._.var.browser_message_frame_registered_handlers[name] = handler; // standard handlers are only added if not already set above
          }
        });
        let processed = [];
        chrome.runtime.onMessage.addListener(function (msg, sender, respond) {
          return tool.catch.try(function () {
            if(msg.to === listen_for_tab_id || msg.to === 'broadcast') {
              if(!tool.value(msg.uid).in(processed)) {
                processed.push(msg.uid);
                if(typeof tool._.var.browser_message_frame_registered_handlers[msg.name] !== 'undefined') {
                  tool._.var.browser_message_frame_registered_handlers[msg.name](msg.data, sender, respond);
                } else if(msg.name !== '_tab_' && msg.to !== 'broadcast') {
                  if(tool._.browser_message_destination_parse(msg.to).frame !== null) { // only consider it an error if frameId was set because of firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1354337
                    tool.catch.report('tool.browser.message.listen error: handler "' + msg.name + '" not set', 'Message sender stack:\n' + msg.stack);
                  } else { // once firefox fixes the bug, it will behave the same as Chrome and the following will never happen.
                    console.log('tool.browser.message.listen ignoring missing handler "' + msg.name + '" due to Firefox Bug');
                  }
                }
              }
            }
            return msg.respondable === true;
          })();
        });
      },
      listen_background: (handlers) => {
        if(!tool._.var.browser_message_background_script_registered_handlers) {
          tool._.var.browser_message_background_script_registered_handlers = handlers;
        } else {
          tool.each(handlers, function(name, handler) {
            tool._.var.browser_message_background_script_registered_handlers[name] = handler;
          });
        }
        chrome.runtime.onMessage.addListener(function (msg, sender, respond) {
          let safe_respond = function (response) {
            try { // avoiding unnecessary errors when target tab gets closed
              respond(response);
            } catch(e) {
              if(e.message !== 'Attempting to use a disconnected port object') {
                tool.catch.handle_exception(e);
                throw e;
              }
            }
          };
          if(msg.to && msg.to !== 'broadcast') {
            msg.sender = sender;
            chrome.tabs.sendMessage(tool._.browser_message_destination_parse(msg.to).tab, msg, undefined, safe_respond);
          } else if(tool.value(msg.name).in(Object.keys(tool._.var.browser_message_background_script_registered_handlers))) {
            tool._.var.browser_message_background_script_registered_handlers[msg.name](msg.data, sender, safe_respond);
          } else if(msg.to !== 'broadcast') {
            tool.catch.report('tool.browser.message.listen_background error: handler "' + msg.name + '" not set', 'Message sender stack:\n' + msg.stack);
          }
          return msg.respondable === true;
        });
      },
    },
  },
  diagnose: {
    message_pubkeys: (account_email, message) => {
      if(typeof message === 'string') {
        message = openpgp.message.readArmored(message);
      } else if(message instanceof Uint8Array) {
        message = openpgp.message.readArmored(tool.str.from_uint8(message));
      }
      return tool.catch.Promise(function(resolve, reject) {
        let message_key_ids = message.getEncryptionKeyIds();
        storage.keys_get(account_email).then(function(private_keys) {
          let local_key_ids = [].concat.apply([], private_keys.map(function(ki) {return ki.public}).map(tool._.crypto_key_ids));
          let diagnosis = { found_match: false, receivers: message_key_ids.length };
          tool.each(message_key_ids, function (i, msg_k_id) {
            tool.each(local_key_ids, function (j, local_k_id) {
              if(msg_k_id === local_k_id) {
                diagnosis.found_match = true;
                return false;
              }
            });
          });
          resolve(diagnosis);
        });
      });
    },
    keyserver_pubkeys: (account_email, callback) => {
      let diagnosis = { has_pubkey_missing: false, has_pubkey_mismatch: false, results: {} };
      storage.get(account_email, ['addresses'], function (s) {
        storage.keys_get(account_email).then(function(stored_keys) {
          let stored_keys_longids = stored_keys.map(function(ki) { return ki.longid; });
          tool.api.attester.lookup_email(tool.arr.unique([account_email].concat(s.addresses || []))).then(function(pubkey_search_results) {
            tool.each((pubkey_search_results as any).results, function (i, pubkey_search_result) { // todo:ts any
              if (!pubkey_search_result.pubkey) {
                diagnosis.has_pubkey_missing = true;
                diagnosis.results[pubkey_search_result.email] = {attested: false, pubkey: null, match: false};
              } else {
                let match = true;
                if (!tool.value(tool.crypto.key.longid(pubkey_search_result.pubkey)).in(stored_keys_longids)) {
                  diagnosis.has_pubkey_mismatch = true;
                  match = false;
                }
                diagnosis.results[pubkey_search_result.email] = {
                  pubkey: pubkey_search_result.pubkey,
                  attested: pubkey_search_result.attested,
                  match: match
                };
              }
            });
            callback(diagnosis);
          }, function(error) {
            callback();
          });
        });
      });
    },
  },
  crypto: {
    armor: {
      strip: (pgp_block_text) => {
        if(!pgp_block_text) {
          return pgp_block_text;
        }
        let debug = false;
        if(debug) {
          console.log('pgp_block_1');
          console.log(pgp_block_text);
        }
        let newlines = [/<div><br><\/div>/g, /<\/div><div>/g, /<[bB][rR]( [a-zA-Z]+="[^"]*")* ?\/? ?>/g, /<div ?\/?>/g];
        let spaces = [/&nbsp;/g];
        let removes = [/<wbr ?\/?>/g, /<\/?div>/g];
        tool.each(newlines, function (i, newline) {
          pgp_block_text = pgp_block_text.replace(newline, '\n');
        });
        if(debug) {
          console.log('pgp_block_2');
          console.log(pgp_block_text);
        }
        tool.each(removes, function (i, remove) {
          pgp_block_text = pgp_block_text.replace(remove, '');
        });
        if(debug) {
          console.log('pgp_block_3');
          console.log(pgp_block_text);
        }
        tool.each(spaces, function (i, space) {
          pgp_block_text = pgp_block_text.replace(space, ' ');
        });
        if(debug) {
          console.log('pgp_block_4');
          console.log(pgp_block_text);
        }
        pgp_block_text = pgp_block_text.replace(/\r\n/g, '\n');
        if(debug) {
          console.log('pgp_block_5');
          console.log(pgp_block_text);
        }
        pgp_block_text = $('<div>' + pgp_block_text + '</div>').text();
        if(debug) {
          console.log('pgp_block_6');
          console.log(pgp_block_text);
        }
        let double_newlines = pgp_block_text.match(/\n\n/g);
        if(double_newlines !== null && double_newlines.length > 2) { //a lot of newlines are doubled
          pgp_block_text = pgp_block_text.replace(/\n\n/g, '\n');
          if(debug) {
            console.log('pgp_block_removed_doubles');
          }
        }
        if(debug) {
          console.log('pgp_block_7');
          console.log(pgp_block_text);
        }
        pgp_block_text = pgp_block_text.replace(/^ +/gm, '');
        if(debug) {
          console.log('pgp_block_final');
          console.log(pgp_block_text);
        }
        return pgp_block_text;
      },
      clip: (text) => {
        if(text && tool.value(tool._.var.crypto_armor_headers_DICT['null'].begin).in(text) && tool.value(tool._.var.crypto_armor_headers_DICT['null'].end).in(text)) {
          let match = text.match(/(-----BEGIN PGP (MESSAGE|SIGNED MESSAGE|SIGNATURE|PUBLIC KEY BLOCK)-----[^]+-----END PGP (MESSAGE|SIGNATURE|PUBLIC KEY BLOCK)-----)/gm);
          return(match !== null && match.length) ? match[0] : null;
        }
        return null;
      },
      headers: (block_type, format='string') => {
        if(format === 're') {
          let h = tool._.var.crypto_armor_headers_DICT[block_type || null];
          if(typeof h.exec === 'function') {
            return h;
          }
          return tool.obj.map(h, function (header_value) {
            if(typeof h === 'string') {
              return header_value.replace(/ /g, '\\\s'); // regexp match friendly
            } else {
              return header_value;
            }
          });
        } else {
          return tool._.var.crypto_armor_headers_DICT[block_type || null];
        }
      },
      detect_blocks: (original_text) => {
        let structure = [];
        original_text = tool.str.normalize_spaces(original_text);
        let start_at = 0;
        while(true) {
          let r = tool._.crypto_armor_detect_block_next(original_text, start_at);
          if(r.found) {
            structure = structure.concat(r.found);
          }
          if(!r.continue_at) {
            return structure;
          } else {
            start_at = r.continue_at;
          }
        }
      },
      replace_blocks: (factory: any, original_text, message_id, sender_email, is_outgoing) => {
        let blocks = tool.crypto.armor.detect_blocks(original_text);
        if(blocks.length === 1 && blocks[0].type === 'text') {
          return;
        }
        let r = '';
        tool.each(blocks, function(i, block) {
          if(block.type === 'text' || block.type === 'private_key') {
            r += (Number(i) ? '\n\n' : '') + tool.str.html_escape(block.content) + '\n\n';
          } else if (block.type === 'message') {
            r += factory.embedded.message(block.complete ? tool.crypto.armor.normalize(block.content, 'message') : '', message_id, is_outgoing, sender_email, false);
          } else if (block.type === 'signed_message') {
            r += factory.embedded.message(block.content, message_id, is_outgoing, sender_email, false);
          } else if (block.type === 'public_key') {
            r += factory.embedded.pubkey(tool.crypto.armor.normalize(block.content, 'public_key'), is_outgoing);
          } else if (block.type === 'password_message') {
            r += factory.embedded.message('', message_id, is_outgoing, sender_email, true, null, block.content); // here block.content is message short id
          } else if (block.type === 'attest_packet') {
            // todo - find out why
            // noinspection TypeScriptValidateJSTypes
            r += factory.embedded.attest(block.content);
          } else if (block.type === 'cryptup_verification') {
            r += factory.embedded.verification(block.content);
          } else {
            tool.catch.report('dunno how to process block type: ' + block.type);
          }
        });
        return r;
      },
      normalize: (armored, type) => {
        if(tool.value(type).in(['message', 'public_key', 'private_key', 'key'])) {
          armored = armored.replace(/\r?\n/g, '\n').trim();
          let nl_2 = armored.match(/\n\n/g);
          let nl_3 = armored.match(/\n\n\n/g);
          let nl_4 = armored.match(/\n\n\n\n/g);
          let nl_6 = armored.match(/\n\n\n\n\n\n/g);
          if (nl_3 && nl_6 && nl_3.length > 1 && nl_6.length === 1) {
            return armored.replace(/\n\n\n/g, '\n'); // newlines tripled: fix
          } else if(nl_2 && nl_4 && nl_2.length > 1 && nl_4.length === 1) {
            return armored.replace(/\n\n/g, '\n'); // newlines doubled.GPA on windows does this, and sometimes message can get extracted this way from html
          }
          return armored;
        } else {
          return armored;
        }
      },
    },
    hash: {
      sha1: (string) => tool.str.to_hex(tool.str.from_uint8(openpgp.crypto.hash.sha1(string))),
      double_sha1_upper: (string) => tool.crypto.hash.sha1(tool.crypto.hash.sha1(string)).toUpperCase(),
      sha256: (string) => tool.str.to_hex(tool.str.from_uint8(openpgp.crypto.hash.sha256(string))),
      challenge_answer: (answer) => tool._.crypto_hash_sha256_loop(answer),
    },
    key: {
      create: (user_ids_as_pgp_contacts, num_bits, pass_phrase, callback) => {
        openpgp.generateKey({
          numBits: num_bits,
          userIds: user_ids_as_pgp_contacts,
          passphrase: pass_phrase,
        }).then(function(key) {
          callback(key.privateKeyArmored);
        }).catch(function(error) {
          tool.catch.handle_exception(error);
        });
      },
      read: (armored_key) => openpgp.key.readArmored(armored_key).keys[0],
      decrypt: (prv, passphrase) => { // {success: true|false, error: undefined|str}
        try {
          return {success: prv.decrypt(passphrase)};
        } catch(primary_e) {
          if(!tool.value(primary_e.message).in(['Unknown s2k type.', 'Invalid enum value.'])) {
            return {success: false, error: 'primary decrypt error: "' + primary_e.message + '"'}; // unknown exception for master key
          } else if(prv.subKeys !== null && prv.subKeys.length) {
            let subkes_succeeded = 0;
            let subkeys_unusable = 0;
            let unknown_exception;
            tool.each(prv.subKeys, function(i, subkey) {
              try {
                subkes_succeeded += subkey.subKey.decrypt(passphrase);
              } catch(subkey_e) {
                subkeys_unusable++;
                if(!tool.value(subkey_e.message).in(['Key packet is required for this signature.', 'Unknown s2k type.', 'Invalid enum value.'])) {
                  unknown_exception = subkey_e;
                  return false;
                }
              }
            });
            if(unknown_exception) {
              return {success: false, error: 'subkey decrypt error: "' + unknown_exception.message + '"'};
            }
            return {success: subkes_succeeded > 0 && (subkes_succeeded + subkeys_unusable) === prv.subKeys.length};
          } else {
            return {success: false, error: 'primary decrypt error and no subkeys to try: "' + primary_e.message + '"'};
          }
        }
      },
      expired_for_encryption: (key) => {
        if(key.getEncryptionKeyPacket() !== null) {
          return false;
        }
        if(key.verifyPrimaryKey() === openpgp.enums.keyStatus.expired) {
          return true;
        }
        let found_expired_subkey = false;
        tool.each(key.subKeys, function (i, sub_key) {
          if(sub_key.verify(key.primaryKey) === openpgp.enums.keyStatus.expired && sub_key.isValidEncryptionKey(key.primaryKey)) {
            found_expired_subkey = true;
            return false;
          }
        });
        return found_expired_subkey; // todo - shouldn't we be checking that ALL subkeys are either invalid or expired to declare a key expired?
      },
      normalize: (armored) => {
        try {
          armored = tool.crypto.armor.normalize(armored, 'key');
          let key;
          if(RegExp(tool.crypto.armor.headers('public_key', 're').begin).test(armored)) {
            key = openpgp.key.readArmored(armored).keys[0];
          } else if(RegExp(tool.crypto.armor.headers('message', 're').begin).test(armored)) {
            key = openpgp.key.Key(openpgp.message.readArmored(armored).packets);
          }
          if(key) {
            return key.armor();
          } else {
            return armored;
          }
        } catch(error) {
          tool.catch.handle_exception(error);
        }
      },
      fingerprint: (key, formatting:"default"|"spaced"='default') => {
        if(key === null || typeof key === 'undefined') {
          return null;
        } else if(typeof key.primaryKey !== 'undefined') {
          if(key.primaryKey.fingerprint === null) {
            return null;
          }
          try {
            let fp = key.primaryKey.fingerprint.toUpperCase();
            if(formatting === 'spaced') {
              return fp.replace(/(.{4})/g, '$1 ').trim();
            }
            return fp;
          } catch(error) {
            console.log(error);
            return null;
          }
        } else {
          try {
            return tool.crypto.key.fingerprint(openpgp.key.readArmored(key).keys[0], formatting);
          } catch(error) {
            if(error.message === 'openpgp is not defined') {
              tool.catch.handle_exception(error);
            }
            console.log(error);
            return null;
          }
        }
      },
      longid: (key_or_fingerprint_or_bytes) => {
        if(key_or_fingerprint_or_bytes === null || typeof key_or_fingerprint_or_bytes === 'undefined') {
          return null;
        } else if(key_or_fingerprint_or_bytes.length === 8) {
          return tool.str.to_hex(key_or_fingerprint_or_bytes).toUpperCase();
        } else if(key_or_fingerprint_or_bytes.length === 40) {
          return key_or_fingerprint_or_bytes.substr(-16);
        } else if(key_or_fingerprint_or_bytes.length === 49) {
          return key_or_fingerprint_or_bytes.replace(/ /g, '').substr(-16);
        } else {
          return tool.crypto.key.longid(tool.crypto.key.fingerprint(key_or_fingerprint_or_bytes));
        }
      },
      test: (armored, passphrase, callback) => {
        try {
          openpgp.encrypt({ data: 'this is a test', armor: true, publicKeys: [openpgp.key.readArmored(armored).keys[0].toPublic()] }).then(function (result) {
            let prv = openpgp.key.readArmored(armored).keys[0];
            tool.crypto.key.decrypt(prv, passphrase);
            openpgp.decrypt({ message: openpgp.message.readArmored(result.data), format: 'utf8', privateKey: prv }).then(function () {
              callback(true);
            }).catch(function (error) {
              callback(false, error.message);
            });
          }).catch(function (error) {
            callback(false, error.message);
          });
        } catch(error) {
          callback(false, error.message);
        }
      },
      usable: (armored) => { // is pubkey usable for encrytion?
        if(!tool.crypto.key.fingerprint(armored)) {
          return false;
        }
        let pubkey = openpgp.key.readArmored(armored).keys[0];
        if(!pubkey) {
          return false;
        }
        tool._.crypto_key_patch_public_keys_to_ignore_expiration([pubkey]);
        return pubkey.getEncryptionKeyPacket() !== null;
      },
    },
    message: {
      sign: (signing_prv, data, armor, callback) => {
        let options = { data: data, armor: armor, privateKeys: signing_prv, };
        openpgp.sign(options).then(function(result) {callback(true, result.data)}, function (error) {callback(false, error.message)});
      },
      verify: (message, keys_for_verification, optional_contact) => {
        let signature = { signer: null, contact: optional_contact || null,  match: null, error: null };
        try {
          tool.each(message.verify(keys_for_verification), function (i, verify_result) {
            signature.match = tool.value(signature.match).in([true, null]) && verify_result.valid; // this will probably falsely show as not matching in some rare cases. Needs testing.
            if(!signature.signer) {
              signature.signer = tool.crypto.key.longid(verify_result.keyid.bytes);
            }
          });
        } catch(verify_error) {
          signature.match = null;
          if(verify_error.message === 'Can only verify message with one literal data packet.') {
            signature.error = 'FlowCrypt is not equipped to verify this message (err 101)';
          } else {
            signature.error = 'FlowCrypt had trouble verifying this message (' + verify_error.message + ')';
            tool.catch.handle_exception(verify_error);
          }
        }
        return signature;
      },
      verify_detached: (account_email, plaintext, signature_text, callback) => {
        if(plaintext instanceof Uint8Array) { // until https://github.com/openpgpjs/openpgpjs/issues/657 fixed
          plaintext = tool.str.from_uint8(plaintext);
        }
        if(signature_text instanceof Uint8Array) { // until https://github.com/openpgpjs/openpgpjs/issues/657 fixed
          signature_text = tool.str.from_uint8(signature_text);
        }
        let message = openpgp.message.readSignedContent(plaintext, signature_text);
        tool._.crypto_message_get_sorted_keys_for_message(account_email, message, function(keys) {
          callback(tool.crypto.message.verify(message, keys.for_verification, keys.verification_contacts[0]));
        });
      },
      decrypt: (account_email, encrypted_data, message_password, callback, output_format:"utf8"|"binary"|null=null) => {
        let first_100_bytes = encrypted_data.slice(0, 100);
        if(first_100_bytes instanceof Uint8Array) {
          first_100_bytes = tool.str.from_uint8(first_100_bytes);
        }
        let armored_encrypted = tool.value(tool.crypto.armor.headers('message').begin).in(first_100_bytes);
        let armored_signed_only = tool.value(tool.crypto.armor.headers('signed_message').begin).in(first_100_bytes);
        let is_armored = armored_encrypted || armored_signed_only;
        if(is_armored && encrypted_data instanceof Uint8Array) {
          encrypted_data = tool.str.from_uint8(encrypted_data);
        }
        let other_errors = [];
        let message;
        try {
          if(armored_encrypted) {
            message = openpgp.message.readArmored(encrypted_data);
          } else if(armored_signed_only) {
            message = openpgp.cleartext.readArmored(encrypted_data);
          } else {
            message = openpgp.message.read(typeof encrypted_data === 'string' ? tool.str.to_uint8(encrypted_data) : encrypted_data);
          }
        } catch(format_error) {
          callback({success: false, counts: tool._.crypto_message_zeroed_decrypt_error_counts(), format_error: format_error.message, errors: other_errors, encrypted: null, signature: null});
          return;
        }
        tool._.crypto_message_get_sorted_keys_for_message(account_email, message, function (keys) {
          let counts = tool._.crypto_message_zeroed_decrypt_error_counts(keys);
          if(armored_signed_only) {
            if(!message.text) {
              let sm_headers = tool.crypto.armor.headers('signed_message', 're');
              let text = encrypted_data.match(RegExp(sm_headers.begin + '\nHash:\s[A-Z0-9]+\n([^]+)\n' + sm_headers.middle + '[^]+' + sm_headers.end, 'm'));
              message.text = text && text.length === 2 ? text[1] : encrypted_data;
            }
            callback({success: true, content: { data: message.text }, encrypted: false, signature: tool.crypto.message.verify(message, keys.for_verification, keys.verification_contacts[0])});
          } else {
            let missing_passphrases = keys.without_passphrases.map(function (ki) { return ki.longid; });
            if(!keys.with_passphrases.length && !message_password) {
              callback({success: false, signature: null, message: message, counts: counts, unsecure_mdc: !!counts.unsecure_mdc, encrypted_for: keys.encrypted_for, missing_passphrases: missing_passphrases, errors: other_errors});
            } else {
              let keyinfos_for_looper = keys.with_passphrases.slice(); // copy keyinfo array
              let keep_trying_until_decrypted_or_all_failed = function () {
                tool.catch.try(function () {
                  if(!counts.decrypted && keyinfos_for_looper.length) {
                    try {
                      openpgp.decrypt(tool._.crypto_message_get_decrypt_options(message, keyinfos_for_looper.shift(), is_armored, message_password, output_format)).then(function (decrypted) {
                        tool.catch.try(function () {
                          if(!counts.decrypted++) { // don't call back twice if encrypted for two of my keys
                            // let signature_result = keys.signed_by.length ? tool.crypto.message.verify(message, keys.for_verification, keys.verification_contacts[0]) : false;
                            let signature_result = null;
                            if(tool._.crypto_message_chained_decryption_result_collector(callback, {success: true, content: decrypted, encrypted: true, signature: signature_result})) {
                              keep_trying_until_decrypted_or_all_failed();
                            }
                          }
                        })();
                      }).catch(function (decrypt_error) {
                        tool.catch.try(function () {
                          tool._.crypto_message_increment_decrypt_error_counts(counts, other_errors, message_password, decrypt_error);
                          if(tool._.crypto_message_chained_decryption_result_collector(callback, {success: false, signature: null, message: message, counts: counts, unsecure_mdc: !!counts.unsecure_mdc, encrypted_for: keys.encrypted_for, missing_passphrases: missing_passphrases, errors: other_errors})) {
                            keep_trying_until_decrypted_or_all_failed();
                          }
                        })();
                      });
                    } catch(decrypt_exception) {
                      other_errors.push(String(decrypt_exception));
                      counts.attempts++;
                      if(tool._.crypto_message_chained_decryption_result_collector(callback, {success: false, signature: null, message: message, counts: counts, unsecure_mdc: !!counts.unsecure_mdc, encrypted_for: keys.encrypted_for, missing_passphrases: missing_passphrases, errors: other_errors})) {
                        keep_trying_until_decrypted_or_all_failed();
                      }
                    }
                  }
                })();
              };
              keep_trying_until_decrypted_or_all_failed(); // first attempt
            }
          }
        });
      },
      encrypt: (armored_pubkeys, signing_prv, challenge, data, filename, armor, callback) => {
        let options = { data: data, armor: armor };
        if(filename) {
          options['filename'] = filename;
        }
        let used_challange = false;
        if(armored_pubkeys) {
          options['publicKeys'] = [];
          tool.each(armored_pubkeys, function (i, armored_pubkey) {
            options['publicKeys'] = options['publicKeys'].concat(openpgp.key.readArmored(armored_pubkey).keys);
          });
          tool._.crypto_key_patch_public_keys_to_ignore_expiration(options['publicKeys']);
        }
        if(challenge && challenge.answer) {
          options['passwords'] = [tool.crypto.hash.challenge_answer(challenge.answer)];
          used_challange = true;
        }
        if(!armored_pubkeys && !used_challange) {
          alert('Internal error: don\'t know how to encryt message. Please refresh the page and try again, or contact me at human@flowcrypt.com if this happens repeatedly.');
          throw new Error('no-pubkeys-no-challenge');
        }
        if(signing_prv && typeof signing_prv.isPrivate !== 'undefined' && signing_prv.isPrivate()) {
          options['privateKeys'] = [signing_prv];
        }
        openpgp.encrypt(options).then(function (result) {
          tool.catch.try(function () { // todo - this is very awkward, should create a Try wrapper with a better api
            callback(result);
          })();
        }, function (error) {
          console.log(error);
          alert('Error encrypting message, please try again. If you see this repeatedly, contact me at human@flowcrypt.com.');
          //todo: make the UI behave well on errors
        });
      },
    },
    password: {
      estimate_strength: (zxcvbn_result_guesses) => {
        let time_to_crack = zxcvbn_result_guesses / tool._.var.crypto_password_GUESSES_PER_SECOND;
        for(let i = 0; i < tool._.var.crypto_password_CRACK_TIME_WORDS.length; i++) {
          let readable_time = tool._.readable_crack_time(time_to_crack);
          if(tool.value(tool._.var.crypto_password_CRACK_TIME_WORDS[i][0]).in(readable_time)) { // looks for a word match from readable_crack_time, defaults on "weak"
            return {
              word: tool._.var.crypto_password_CRACK_TIME_WORDS[i][1],
              bar: tool._.var.crypto_password_CRACK_TIME_WORDS[i][2],
              time: readable_time,
              seconds: Math.round(time_to_crack),
              pass: tool._.var.crypto_password_CRACK_TIME_WORDS[i][4],
              color: tool._.var.crypto_password_CRACK_TIME_WORDS[i][3],
              suggestions: [],
            };
          }
        }
      },
      weak_words: () => [
        'crypt', 'up', 'cryptup', 'flow', 'flowcrypt', 'encryption', 'pgp', 'email', 'set', 'backup', 'passphrase', 'best', 'pass', 'phrases', 'are', 'long', 'and', 'have', 'several',
        'words', 'in', 'them', 'Best pass phrases are long', 'have several words', 'in them', 'bestpassphrasesarelong', 'haveseveralwords', 'inthem',
        'Loss of this pass phrase', 'cannot be recovered', 'Note it down', 'on a paper', 'lossofthispassphrase', 'cannotberecovered', 'noteitdown', 'onapaper',
        'setpassword', 'set password', 'set pass word', 'setpassphrase', 'set pass phrase', 'set passphrase'
      ],
    }
  },
  api: {
    auth: {
      window: (auth_url, window_closed_by_user) => {
        let auth_code_window = window.open(auth_url, '_blank', 'height=600,left=100,menubar=no,status=no,toolbar=no,top=100,width=500');
        let window_closed_timer = setInterval(function () {
          if(auth_code_window.closed) {
            clearInterval(window_closed_timer);
            window_closed_by_user();
          }
        }, 500);
        return function() {
          clearInterval(window_closed_timer);
          auth_code_window.close();
        };
      },
      parse_id_token: (id_token) => JSON.parse(atob(id_token.split(/\./g)[1])),
    },
    error: {
      network: 'API_ERROR_NETWORK',
    },
    google: {
      user_info: (account_email, callback) => tool._.api_google_call(account_email, 'GET', 'https://www.googleapis.com/oauth2/v1/userinfo', {alt: 'json'}, callback),
      auth: (auth_request, respond) => {
        tool.browser.message.tab_id(function(tab_id) {
          auth_request.tab_id = tab_id;
          storage.get(auth_request.account_email, ['google_token_access', 'google_token_expires', 'google_token_refresh', 'google_token_scopes'], function (s) {
            if (typeof s.google_token_access === 'undefined' || typeof s.google_token_refresh === 'undefined' || tool._.api_google_has_new_scope(auth_request.scopes, s.google_token_scopes, auth_request.omit_read_scope)) {
              if(!tool.env.is_background_script()) {
                tool.api.google.auth_popup(auth_request, s.google_token_scopes, respond);
              } else {
                respond({success: false, error: 'Cannot produce auth window from background script'});
              }
            } else {
              tool._.google_auth_refresh_token(s.google_token_refresh, function (success, result) {
                if (!success && result === tool.api.error.network) {
                  respond({success: false, error: tool.api.error.network});
                } else if (typeof result.access_token !== 'undefined') {
                  tool._.google_auth_save_tokens(auth_request.account_email, result, s.google_token_scopes, function () {
                    respond({ success: true, message_id: auth_request.message_id, account_email: auth_request.account_email }); //todo: email should be tested first with google_auth_check_email?
                  });
                } else if(!tool.env.is_background_script()) {
                  tool.api.google.auth_popup(auth_request, s.google_token_scopes, respond);
                } else {
                  respond({success: false, error: 'Cannot show auth window from background script'});
                }
              });
            }
          });
        });
      },
      auth_popup: (auth_request, current_google_token_scopes, respond) => {
        auth_request.auth_responder_id = tool.str.random(20);
        tool._.var.api_google_auth_responders[auth_request.auth_responder_id] = respond;
        auth_request.scopes = auth_request.scopes || [];
        tool.each(tool._.var.google_oauth2.scopes, function (i, scope) {
          if(!tool.value(scope).in(auth_request.scopes)) {
            if(scope !== tool.api.gmail.scope('read') || !auth_request.omit_read_scope) { // leave out read messages permission if user chose so
              auth_request.scopes.push(scope);
            }
          }
        });
        tool.each(current_google_token_scopes || [], function (i, scope) {
          if(!tool.value(scope).in(auth_request.scopes)) {
            auth_request.scopes.push(scope);
          }
        });
        let result_listener = { google_auth_window_result: function(result, sender, respond) { tool._.google_auth_window_result_handler(auth_request.auth_responder_id, result, respond); } };
        if(auth_request.tab_id !== null) {
          tool.browser.message.listen(result_listener, auth_request.tab_id);
        } else {
          tool.browser.message.listen_background(result_listener);
        }
        let auth_code_window = window.open(tool._.api_google_auth_code_url(auth_request), '_blank', 'height=600,left=100,menubar=no,status=no,toolbar=no,top=100,width=500');
        // auth window will show up. Inside the window, google_auth_code.js gets executed which will send
        // a 'gmail_auth_code_result' chrome message to 'google_auth.google_auth_window_result_handler' and close itself
        let window_closed_timer;
        if(tool.env.browser().name !== 'firefox') {
          window_closed_timer = setInterval(api_google_auth_window_closed_watcher, 250);
        }
        function api_google_auth_window_closed_watcher() {
          if(auth_code_window !== null && typeof auth_code_window !== 'undefined' && auth_code_window.closed) { // on firefox it seems to be sometimes returning a null, due to popup blocking
            clearInterval(window_closed_timer);
            if(tool._.var.api_google_auth_responders[auth_request.auth_responder_id] !== tool._.var.api_google_AUTH_RESPONDED) {
              // if user did clock Allow/Deny on auth, race condition is prevented, because auth_responders[] are always marked as RESPONDED before closing window.
              // thus it's impossible for another process to try to respond before the next line
              // that also means, if window got closed and it's not marked as RESPONDED, it was the user closing the window manually, which is what we're watching for.
              tool._.var.api_google_auth_responders[auth_request.auth_responder_id]({success: false, result: 'closed', account_email: auth_request.account_email, message_id: auth_request.message_id});
              tool._.var.api_google_auth_responders[auth_request.auth_responder_id] = tool._.var.api_google_AUTH_RESPONDED;
            }
          }
        }
      },
    },
    common: {
      message: (account_email, from, to, subject, body, attachments, thread_referrence) => {
        from = from || '';
        to = to || '';
        subject = subject || '';
        // let primary_pubkey = storage.keys_get(account_email, 'primary'); // todo - changing to async - add back later
        return {
          // headers: (typeof exports !== 'object' && primary_pubkey !== null) ? { // todo - make it work in electron as well
          //   OpenPGP: 'id=' + primary_pubkey.fingerprint,
          // } : {},
          headers: {},
          from: from,
          to: typeof to === 'object' ? to : to.split(','),
          subject: subject,
          body: typeof body === 'object' ? body : {'text/plain': body},
          attachments: attachments || [],
          thread: thread_referrence || null,
        };
      },
      reply_correspondents: (account_email, addresses, last_message_sender, last_message_recipients) => {
        let reply_to_estimate = [last_message_sender].concat(last_message_recipients);
        let reply_to = [];
        let my_email = account_email;
        tool.each(reply_to_estimate, function (i, email) {
          if(email) {
            if(tool.value(tool.str.parse_email(email).email).in(addresses)) { // my email
              my_email = email;
            } else if(!tool.value(tool.str.parse_email(email).email).in(reply_to)) { // skip duplicates
              reply_to.push(tool.str.parse_email(email).email); // reply to all except my emails
            }
          }
        });
        if(!reply_to.length) { // happens when user sends email to itself - all reply_to_estimage contained his own emails and got removed
          reply_to = tool.arr.unique(reply_to_estimate);
        }
        return {to: reply_to, from: my_email};
      },
    },
    gmail: {
      query: {
        or: (arr, quoted) => {
          if(quoted) {
            return '("' + arr.join('") OR ("') + '")';
          } else {
            return '(' + arr.join(') OR (') + ')';
          }
        },
        backups: (account_email) => {
          return [
            'from:' + account_email,
            'to:' + account_email,
            '(subject:"' + tool.enums.recovery_email_subjects.join('" OR subject: "') + '")',
            '-is:spam',
          ].join(' ');
        },
      },
      scope: (scope) => (typeof scope === 'string') ? tool._.var.api_gmail_SCOPE_DICT[scope] : scope.map(tool.api.gmail.scope),
      has_scope: (scopes, scope) => scopes && tool.value(tool._.var.api_gmail_SCOPE_DICT[scope]).in(scopes),
      thread_get: (account_email, thread_id, format, get_thread_callback) => {
        tool._.api_gmail_call(account_email, 'GET', 'threads/' + thread_id, {
          format: format
        }, get_thread_callback);
      },
      draft_create: (account_email, mime_message, thread_id, callback) => {
        tool._.api_gmail_call(account_email, 'POST', 'drafts', {
          message: {
            raw: tool.str.base64url_encode(mime_message),
            threadId: thread_id || null,
          },
        }, callback);
      },
      draft_delete: (account_email, id, callback) => {
        tool._.api_gmail_call(account_email, 'DELETE', 'drafts/' + id, null, callback);
      },
      draft_update: (account_email, id, mime_message, callback) => {
        tool._.api_gmail_call(account_email, 'PUT', 'drafts/' + id, {
          message: {
            raw: tool.str.base64url_encode(mime_message),
          },
        }, callback);
      },
      draft_get: (account_email, id, format, callback) => {
        tool._.api_gmail_call(account_email, 'GET', 'drafts/' + id, {
          format: format || 'full'
        }, callback);
      },
      draft_send: (account_email, id, callback) => {  // todo - not used yet, and should be
        tool._.api_gmail_call(account_email, 'POST', 'drafts/send', {
          id: id,
        }, callback);
      },
      message_send: (account_email, message, callback, progress_callback) => {
        message.headers.From = message.from;
        message.headers.To = message.to.join(',');
        message.headers.Subject = message.subject;
        tool.mime.encode(message.body, message.headers, message.attachments, function(mime_message) {
          let request = tool._.encode_as_multipart_related({ 'application/json; charset=UTF-8': JSON.stringify({threadId: message.thread}), 'message/rfc822': mime_message });
          tool._.api_gmail_call(account_email, 'POST', 'messages/send', request.body, callback, undefined, {upload: progress_callback || function () {}}, request.content_type);
        });
      },
      message_list: (account_email, q, include_deleted, callback) => {
        tool._.api_gmail_call(account_email, 'GET', 'messages', {
          q: q,
          includeSpamTrash: include_deleted || false,
        }, callback);
      },
      message_get: (account_email, message_id, format, callback, results={}) => { //format: raw, full or metadata
        if(typeof message_id === 'object') { // todo: chained requests are messy and slow. parallel processing with promises would be better
          if(message_id.length) {
            let id = message_id.pop();
            tool._.api_gmail_call(account_email, 'GET', 'messages/' + id, { format: format || 'full' }, function (success, response) {
              if(success) {
                results[id] = response;
                tool.api.gmail.message_get(account_email, message_id, format, callback, results);
              } else {
                callback(success, response, results);
              }
            });
          } else {
            callback(true, results);
          }
        } else {
          tool._.api_gmail_call(account_email, 'GET', 'messages/' + message_id, { format: format || 'full' }, callback);
        }
      },
      attachment_get: (account_email, message_id, attachment_id, callback, progress_callback=null) => {
        tool._.api_gmail_call(account_email, 'GET', 'messages/' + message_id + '/attachments/' + attachment_id, {}, callback, undefined, {download: progress_callback});
      },
      find_header: (api_gmail_message_object, header_name) => {
        let node = api_gmail_message_object.payload ? api_gmail_message_object.payload : api_gmail_message_object;
        if(typeof node.headers !== 'undefined') {
          for(let i = 0; i < node.headers.length; i++) {
            if(node.headers[i].name.toLowerCase() === header_name.toLowerCase()) {
              return node.headers[i].value;
            }
          }
        }
        return null;
      },
      find_attachments: (gmail_email_object, internal_results=[], internal_message_id=null) => {
        if(typeof gmail_email_object.payload !== 'undefined') {
          internal_message_id = gmail_email_object.id;
          tool.api.gmail.find_attachments(gmail_email_object.payload, internal_results, internal_message_id);
        }
        if(typeof gmail_email_object.parts !== 'undefined') {
          tool.each(gmail_email_object.parts, function (i, part) {
            tool.api.gmail.find_attachments(part, internal_results, internal_message_id);
          });
        }
        if(typeof gmail_email_object.body !== 'undefined' && typeof gmail_email_object.body.attachmentId !== 'undefined') {
          let attachment = {
            message_id: internal_message_id,
            id: gmail_email_object.body.attachmentId,
            size: gmail_email_object.body.size,
            name: gmail_email_object.filename,
            type: gmail_email_object.mimeType,
            inline: (tool.api.gmail.find_header(gmail_email_object, 'content-disposition') || '').toLowerCase().indexOf('inline') === 0,
          };
          attachment['treat_as'] = tool.file.treat_as(attachment);
          internal_results.push(attachment);
        }
        return internal_results;
      },
      find_bodies: (gmail_email_object, internal_results={}) => {
        if(typeof gmail_email_object.payload !== 'undefined') {
          tool.api.gmail.find_bodies(gmail_email_object.payload, internal_results);
        }
        if(typeof gmail_email_object.parts !== 'undefined') {
          tool.each(gmail_email_object.parts, function (i, part) {
            tool.api.gmail.find_bodies(part, internal_results);
          });
        }
        if(typeof gmail_email_object.body !== 'undefined' && typeof gmail_email_object.body.data !== 'undefined' && gmail_email_object.body.size !== 0) {
          internal_results[gmail_email_object.mimeType] = gmail_email_object.body.data;
        }
        return internal_results;
      },
      fetch_attachments: (account_email, attachments, callback, results=[]) => { //todo: parallelize with promises
        let attachment = attachments[results.length];
        tool.api.gmail.attachment_get(account_email, attachment.message_id, attachment.id, function (success, response) {
          if(success) {
            attachment.data = response.data;
            results.push(attachment);
            if(results.length === attachments.length) {
              callback(true, results);
            } else {
              tool.api.gmail.fetch_attachments(account_email, attachments, callback, results);
            }
          } else {
            callback(success, response);
          }
        });
      },
      search_contacts: (account_email, user_query, known_contacts, callback) => { // This will keep triggering callback with new emails as they are being discovered
        let gmail_query = ['is:sent', tool._.var.api_gmail_USELESS_CONTACTS_FILTER];
        if(user_query) {
          let variations_of_to = user_query.split(/[ \.]/g).filter(function(v) {!tool.value(v).in(['com', 'org', 'net']);});
          if(!tool.value(user_query).in(variations_of_to)) {
            variations_of_to.push(user_query);
          }
          gmail_query.push('(to:' + variations_of_to.join(' OR to:') + ')');
        }
        tool.each(known_contacts, function (i, contact) {
          gmail_query.push('-to:"' + contact.email + '"');
        });
        tool._.api_gmail_loop_through_emails_to_compile_contacts(account_email, gmail_query.join(' '), callback);
      },
      /*
      * Extracts the encrypted message from gmail api. Sometimes it's sent as a text, sometimes html, sometimes attachments in various forms.
      * success_callback(str armored_pgp_message)
      * error_callback(str error_type, str html_formatted_data_to_display_to_user)
      *    ---> html_formatted_data_to_display_to_user might be unknown type of mime message, or pgp message with broken format, etc.
      *    ---> The motivation is that user might have other tool to process this. Also helps debugging issues in the field.
      */
      extract_armored_block: (account_email, message_id, format, success_callback, error_callback) => {
        tool.api.gmail.message_get(account_email, message_id, format, function (get_message_success, gmail_message_object) {
          if(get_message_success) {
            if(format === 'full') {
              let bodies = tool.api.gmail.find_bodies(gmail_message_object);
              let attachments = tool.api.gmail.find_attachments(gmail_message_object);
              let armored_message_from_bodies = tool.crypto.armor.clip(tool.str.base64url_decode(bodies['text/plain'])) || tool.crypto.armor.clip(tool.crypto.armor.strip(tool.str.base64url_decode(bodies['text/html'])));
              if(armored_message_from_bodies) {
                success_callback(armored_message_from_bodies);
              } else if(attachments.length) {
                let found = false;
                tool.each(attachments, function (i, attachment_meta) {
                  if(attachment_meta.treat_as === 'message') {
                    found = true;
                    tool.api.gmail.fetch_attachments(account_email, [attachment_meta], function (fetch_attachments_success, attachment) {
                      if(fetch_attachments_success) {
                        let armored_message_text = tool.str.base64url_decode(attachment[0].data);
                        let armored_message = tool.crypto.armor.clip(armored_message_text);
                        if(armored_message) {
                          success_callback(armored_message);
                        } else {
                          error_callback('format', armored_message_text);
                        }
                      } else {
                        error_callback('connection');
                      }
                    });
                    return false;
                  }
                });
                if(!found) {
                  error_callback('format', tool.str.pretty_print(gmail_message_object.payload));
                }
              } else {
                error_callback('format', tool.str.pretty_print(gmail_message_object.payload));
              }
            } else { // format === raw
              tool.mime.decode(tool.str.base64url_decode(gmail_message_object.raw), function (success, mime_message) {
                if(success) {
                  let armored_message = tool.crypto.armor.clip(mime_message.text); // todo - the message might be in attachments
                  if(armored_message) {
                    success_callback(armored_message);
                  } else {
                    error_callback('format');
                  }
                } else {
                  error_callback('format');
                }
              });
            }
          } else {
            error_callback('connection');
          }
        });
      },
      fetch_messages_based_on_query_and_extract_first_available_header: (account_email, q, header_names, callback) => {
        tool.api.gmail.message_list(account_email, q, false, function (success, message_list_response) {
          if(success && typeof message_list_response.messages !== 'undefined') {
            tool._.api_gmail_fetch_messages_sequentially_from_list_and_extract_first_available_header(account_email, message_list_response.messages, header_names, callback);
          } else {
            callback(); // if the request is !success, it will just return undefined, which may not be the best
          }
        });
      },
      fetch_key_backups: (account_email, callback) => {
        tool.api.gmail.message_list(account_email, tool.api.gmail.query.backups(account_email), true, function (success, response) {
          if(success) {
            if(response.messages) {
              let message_ids = response.messages.map(function(m) { return m.id});
              tool.api.gmail.message_get(account_email, message_ids, 'full', function (success, messages) {
                if(success) {
                  let attachments = [];
                  tool.each(messages, function (i, message) {
                    attachments = attachments.concat(tool.api.gmail.find_attachments(message));
                  });
                  tool.api.gmail.fetch_attachments(account_email, attachments, function (success, downloaded_attachments) {
                    let keys = [];
                    tool.each(downloaded_attachments, function (i, downloaded_attachment) {
                      try {
                        let armored_key = tool.str.base64url_decode(downloaded_attachment.data);
                        let key = openpgp.key.readArmored(armored_key).keys[0];
                        if(key.isPrivate()) {
                          keys.push(key);
                        }
                      } catch(err) {}
                    });
                    callback(success, keys);
                  });
                } else {
                  callback(false, 'Connection dropped while checking for backups. Please try again.');
                }
              });
            } else {
              callback(true, null);
            }
          } else {
            callback(false, 'Connection dropped while checking for backups. Please try again.');
          }
        });
      },
    },
    attester: {
      lookup_email: (email) => tool._.api_attester_call('lookup/email', {
        email: (typeof email === 'string') ? tool.str.parse_email(email).email : email.map(function(a) {return tool.str.parse_email(a).email; }),
      }),
      initial_legacy_submit: (email, pubkey, attest) => tool._.api_attester_call('initial/legacy_submit', {
        email: tool.str.parse_email(email).email,
        pubkey: pubkey.trim(),
        attest: attest || false,
      }),
      initial_confirm: (signed_attest_packet) => tool._.api_attester_call('initial/confirm', {
        signed_message: signed_attest_packet,
      }),
      replace_request: (email, signed_attest_packet, new_pubkey) => tool._.api_attester_call('replace/request', {
        signed_message: signed_attest_packet,
        new_pubkey: new_pubkey,
        email: email,
      }),
      replace_confirm: (signed_attest_packet) => tool._.api_attester_call('replace/confirm', {
        signed_message: signed_attest_packet,
      }),
      test_welcome: (email, pubkey) => tool._.api_attester_call('test/welcome', {
        email: email,
        pubkey: pubkey,
      }),
      packet: {
        create_sign: (values, decrypted_prv) => {
          return tool.catch.Promise(function (resolve, reject) {
            let lines = [];
            tool.each(values, function (key, value) {
              lines.push(key + ':' + value);
            });
            let content_text = lines.join('\n');
            let packet = tool.api.attester.packet.parse(tool._.api_attester_packet_armor(content_text));
            if(packet.success !== true) {
              reject({code: null, message: packet.error, internal: 'parse'});
            } else {
              tool.crypto.message.sign(decrypted_prv, content_text, true, function (success, signed_attest_packet) {
                resolve(signed_attest_packet);
              });
            }
          });
        },
        parse: (text) => {
          let accepted_values = {
            'ACT': 'action',
            'ATT': 'attester',
            'ADD': 'email_hash',
            'PUB': 'fingerprint',
            'OLD': 'fingerprint_old',
            'RAN': 'random',
          };
          let result = {
            success: false,
            content: {},
            error: null,
            text: null,
          };
          let packet_headers = tool.crypto.armor.headers('attest_packet', 're');
          let matches = text.match(RegExp(packet_headers.begin + '([^]+)' + packet_headers.end, 'm'));
          if(matches && matches[1]) {
            result.text = matches[1].replace(/^\s+|\s+$/g, '');
            let lines = result.text.split('\n');
            tool.each(lines, function (i, line) {
              let line_parts = line.replace('\n', '').replace(/^\s+|\s+$/g, '').split(':');
              if(line_parts.length !== 2) {
                result.error = 'Wrong content line format';
                return false;
              }
              if(!accepted_values[line_parts[0]]) {
                result.error = 'Unknown line key';
                return false;
              }
              if(result.content[accepted_values[line_parts[0]]]) {
                result.error = 'Duplicate line key';
                return false;
              }
              result.content[accepted_values[line_parts[0]]] = line_parts[1];
            });
            if(result.error !== null) {
              result.content = {};
              return result;
            } else {
              if(result.content['fingerprint'] && result.content['fingerprint'].length !== 40) { //todo - we should use regex here, everywhere
                result.error = 'Wrong PUB line value format';
                result.content = {};
                return result;
              }
              if(result.content['email_hash'] && result.content['email_hash'].length !== 40) {
                result.error = 'Wrong ADD line value format';
                result.content = {};
                return result;
              }
              if(result.content['str_random'] && result.content['str_random'].length !== 40) {
                result.error = 'Wrong RAN line value format';
                result.content = {};
                return result;
              }
              if(result.content['fingerprint_old'] && result.content['fingerprint_old'].length !== 40) {
                result.error = 'Wrong OLD line value format';
                result.content = {};
                return result;
              }
              if(result.content['action'] && !tool.value(result.content['action']).in(['INITIAL', 'REQUEST_REPLACEMENT', 'CONFIRM_REPLACEMENT'])) {
                result.error = 'Wrong ACT line value format';
                result.content = {};
                return result;
              }
              if(result.content['attester'] && !tool.value(result.content['attester']).in(['CRYPTUP'])) {
                result.error = 'Wrong ATT line value format';
                result.content = {};
                return result;
              }
              result.success = true;
              return result;
            }
          } else {
            result.error = 'Could not locate packet headers';
            result.content = {};
            return result;
          }
        },
      },
    },
    cryptup: {
      auth_error: {code: 401, message: 'Could not log in', internal: 'auth'},
      url: (type, variable='') => {
        return {
          'api': 'https://flowcrypt.com/api/',
          'me': 'https://flowcrypt.com/me/' + variable,
          'pubkey': 'https://flowcrypt.com/pub/' + variable,
          'decrypt': 'https://flowcrypt.com/' + variable,
          'web': 'https://flowcrypt.com/',
        }[type];
      },
      help_feedback: (account_email, message) => tool._.api_cryptup_call('help/feedback', {
        email: account_email,
        message: message,
      }),
      help_uninstall: (email, client) => tool._.api_cryptup_call('help/uninstall', {
        email: email,
        client: client,
        metrics: null,
      }),
      account_login: (account_email, token) => {
        return tool.catch.Promise(function(resolve, reject) {
          storage.auth_info(function (registered_email, registered_uuid, already_verified) {
            let uuid = registered_uuid || tool.crypto.hash.sha1(tool.str.random(40));
            let email = registered_email || account_email;
            tool._.api_cryptup_call('account/login', {
              account: email,
              uuid: uuid, token: token || null,
              // @ts-ignore
            }).validate(function (r) {return r.registered === true;}).then(function (response) {
              let to_save = {cryptup_account_email: email, cryptup_account_uuid: uuid, cryptup_account_verified: response.verified === true, cryptup_account_subscription: response.subscription};
              storage.set(null, to_save, function () {
                resolve({verified: response.verified === true, subscription: response.subscription});
              });
            }, reject);
          });
        })
      },
      account_check: (emails) => tool._.api_cryptup_call('account/check', {
        emails: emails,
      }),
      account_check_sync: (callback) => { // callbacks true on updated, false not updated, null for could not fetch
        callback = typeof callback === 'function' ? callback : function() {};
        storage.account_emails_get(function(emails) {
          if(emails.length) {
            tool.api.cryptup.account_check(emails).then(function(response) {
              storage.auth_info(function (cryptup_account_email, cryptup_account_uuid, cryptup_account_verified) {
                storage.subscription(function(stored_level, stored_expire, stored_active, stored_method) {
                  let local_storage_update = {};
                  if((response as any).email) {
                    if((response as any).email !== cryptup_account_email) {
                      // this will of course fail auth on the server when used. The user will be prompted to verify this new device when that happens.
                      local_storage_update['cryptup_account_email'] = (response as any).email;
                      local_storage_update['cryptup_account_uuid'] = tool.crypto.hash.sha1(tool.str.random(40));
                      local_storage_update['cryptup_account_verified'] = false;
                    }
                  } else {
                    if(cryptup_account_email) {
                      local_storage_update['cryptup_account_email'] = null;
                      local_storage_update['cryptup_account_uuid'] = null;
                      local_storage_update['cryptup_account_verified'] = false;
                    }
                  }
                  if((response as any).subscription) {
                    let rs = (response as any).subscription;
                    if(rs.level !== stored_level || rs.method !== stored_method || rs.expire !== stored_expire || stored_active !== !rs.expired) {
                      local_storage_update['cryptup_account_subscription'] = (response as any).subscription;
                    }
                  } else {
                    if(stored_level || stored_expire || stored_active || stored_method) {
                      local_storage_update['cryptup_account_subscription'] = null;
                    }
                  }
                  if(Object.keys(local_storage_update).length) {
                    tool.catch.log('updating account subscription from ' + stored_level + ' to ' + ((response as any).subscription ? (response as any).subscription.level : null), response);
                    storage.set(null, local_storage_update, function() {
                      callback(true);
                    });
                  } else {
                    callback(false);
                  }
                });
              });
            }, function(error) {
              tool.catch.log('could not check account subscription', error);
              callback(null);
            });
          } else {
            callback(null);
          }
        });
      },
      account_update: (update_values) => {
        return tool.catch.Promise(function(resolve, reject) {
          storage.auth_info(function (email, uuid, verified) {
            if(verified) {
              let request = {account: email, uuid: uuid};
              tool.each(update_values || {}, function(k, v) { request[k] = v; });
              // @ts-ignore
              tool._.api_cryptup_call('account/update', request).validate(function(r) {return typeof r.result === 'object' }).then(resolve, reject);
            } else {
              reject(tool.api.cryptup.auth_error);
            }
          });
        });
      },
      account_subscribe: (product, method, payment_source_token) => {
        return tool.catch.Promise(function(resolve, reject) {
          storage.auth_info(function (email, uuid, verified) {
            if(verified) {
              tool._.api_cryptup_call('account/subscribe', {
                account: email,
                uuid: uuid,
                method: method,
                source: payment_source_token,
                product: product,
              }).then(function(response) {
                storage.set(null, { cryptup_account_subscription: (response as any).subscription }, function () {
                  resolve(response);
                });
              }, reject);
            } else {
              reject(tool.api.cryptup.auth_error);
            }
          });
        });
      },
      message_presign_files: (attachments, auth_method) => {
        return tool.catch.Promise(function (resolve, reject) {
          let lengths = attachments.map(function (a) { return a.size; });
          if(!auth_method) {
            tool._.api_cryptup_call('message/presign_files', {
              lengths: lengths,
            }).then(resolve, reject);
          } else if(auth_method === 'uuid') {
            storage.auth_info(function (email, uuid, verified) {
              if(verified) {
                tool._.api_cryptup_call('message/presign_files', {
                  account: email,
                  uuid: uuid,
                  lengths: lengths,
                }).then(resolve, reject);
              } else {
                reject(tool.api.cryptup.auth_error);
              }
            });
          } else {
            tool._.api_cryptup_call('message/presign_files', {
              message_token_account: auth_method.account,
              message_token: auth_method.token,
              lengths: attachments.map(function(a) { return a.size; }),
            }).then(resolve, reject);
          }
        });
      },
      message_confirm_files: (identifiers) => tool._.api_cryptup_call('message/confirm_files', {
        identifiers: identifiers,
      }),
      message_upload: (encrypted_data_armored, auth_method) => { // todo - DEPRECATE THIS. Send as JSON to message/store
        return tool.catch.Promise(function (resolve, reject) {
          if(encrypted_data_armored.length > 100000) {
            reject({code: null, message: 'Message text should not be more than 100 KB. You can send very long texts as attachments.'});
          } else {
            let content = tool.file.attachment('cryptup_encrypted_message.asc', 'text/plain', encrypted_data_armored);
            if(!auth_method) {
              tool._.api_cryptup_call('message/upload', {
                content: content,
              }, 'FORM').then(resolve, reject);
            } else {
              storage.auth_info(function (email, uuid, verified) {
                if(verified) {
                  tool._.api_cryptup_call('message/upload', {
                    account: email,
                    uuid: uuid,
                    content: content,
                  }, 'FORM').then(resolve, reject);
                } else {
                  reject(tool.api.cryptup.auth_error);
                }
              });
            }
          }
        });
      },
      message_token: () => {
        return tool.catch.Promise(function (resolve, reject) {
          storage.auth_info(function (email, uuid, verified) {
            if(verified) {
              tool._.api_cryptup_call('message/token', {
                account: email,
                uuid: uuid,
              }).then(resolve, reject);
            } else {
              reject(tool.api.cryptup.auth_error);
            }
          });
        });
      },
      message_expiration: (admin_codes, add_days) => {
        return tool.catch.Promise(function (resolve, reject) {
          storage.auth_info(function (email, uuid, verified) {
            if(verified) {
              tool._.api_cryptup_call('message/expiration', {
                account: email,
                uuid: uuid,
                admin_codes: admin_codes,
                add_days: add_days || null,
              }).then(resolve, reject);
            } else {
              reject(tool.api.cryptup.auth_error);
            }
          });
        });
      },
      message_reply: (short, token, from, to, subject, message)=> tool._.api_cryptup_call('message/reply', {
        short: short,
        token: token,
        from: from,
        to: to,
        subject: subject,
        message: message,
      }),
      message_contact: (sender, message, message_token) => tool._.api_cryptup_call('message/contact', {
        message_token_account: message_token.account,
        message_token: message_token.token,
        sender: sender,
        message: message,
      }),
      link_message: (short) => tool._.api_cryptup_call('link/message', {
        short: short,
      }),
      link_me: (alias) => tool._.api_cryptup_call('link/me', {
        alias: alias,
      }),
    },
    aws: {
      s3_upload: (items: {base_url:string, fields: any, attachment: any}[], progress_callback) => { // todo:ts
        let progress = tool.arr.zeroes(items.length);
        let promises = [];
        if (!items.length) {
          return Promise.resolve(promises);
        }
        tool.each(items, function (i, item) {
          let values = item.fields;
          values.file = tool.file.attachment('encrpted_attachment', 'application/octet-stream', item.attachment.content);
          promises.push(tool._.api_call(item.base_url, '', values, 'FORM', {upload: function(single_file_progress) {
            progress[i] = single_file_progress;
            tool.ui.event.prevent(tool.ui.event.spree(), function() {
              progress_callback(tool.arr.average(progress)); // this should of course be weighted average. How many years until someone notices?
            })();
          }}));
        });
        return Promise.all(promises);
      },
    }
  },
  value: (v) => ({in: (array_or_str) => tool.arr.contains(array_or_str, v)}),  // tool.value(v).in(array_or_string)
  e: (name, attrs) => $(`<${name}/>`, attrs)[0].outerHTML,
  each: (iterable, looper) => {
    for (let k in iterable) {
      if(iterable.hasOwnProperty(k)){
        if(looper(k, iterable[k]) === false) {
          break;
        }
      }
    }
  },
  enums: {
    recovery_email_subjects: ['Your FlowCrypt Backup', 'Your CryptUp Backup', 'All you need to know about CryptUP (contains a backup)', 'CryptUP Account Backup'],
  },
  _: { 
    var: { // meant to be used privately within this file like so: tool._.vars.???
      // internal variables
      ui_event_fired: {},
      browser_message_background_script_registered_handlers: null,
      browser_message_frame_registered_handlers: {},
      api_google_auth_responders: {},
      // internal constants
      env_url_param_DICT: {'___cu_true___': true, '___cu_false___': false, '___cu_null___': null},
      ui_event_DOUBLE_MS: 1000,
      ui_event_SPREE_MS: 50,
      ui_event_SLOW_SPREE_MS: 200,
      ui_event_VERY_SLOW_SPREE_MS: 500,
      crypto_armor_header_MAX_LENGTH: 50,
      crypto_armor_headers_DICT: {
        null: { begin: '-----BEGIN', end: '-----END' },
        public_key: { begin: '-----BEGIN PGP PUBLIC KEY BLOCK-----', end: '-----END PGP PUBLIC KEY BLOCK-----', replace: true },
        private_key: { begin: '-----BEGIN PGP PRIVATE KEY BLOCK-----', end: '-----END PGP PRIVATE KEY BLOCK-----', replace: true },
        attest_packet: { begin: '-----BEGIN ATTEST PACKET-----', end: '-----END ATTEST PACKET-----', replace: true },
        cryptup_verification: { begin: '-----BEGIN CRYPTUP VERIFICATION-----', end: '-----END CRYPTUP VERIFICATION-----', replace: true },
        signed_message: { begin: '-----BEGIN PGP SIGNED MESSAGE-----', middle: '-----BEGIN PGP SIGNATURE-----', end: '-----END PGP SIGNATURE-----', replace: true },
        signature: { begin: '-----BEGIN PGP SIGNATURE-----', end: '-----END PGP SIGNATURE-----' },
        message: { begin: '-----BEGIN PGP MESSAGE-----', end: '-----END PGP MESSAGE-----', replace: true },
        password_message: { begin: 'This message is encrypted: Open Message', end: /https:(\/|&#x2F;){2}(cryptup\.org|flowcrypt\.com)(\/|&#x2F;)[a-zA-Z0-9]{10}(\n|$)/, replace: true},
      },
      api_gmail_USELESS_CONTACTS_FILTER: '-to:txt.voice.google.com -to:reply.craigslist.org -to:sale.craigslist.org -to:hous.craigslist.org',
      api_gmail_SCOPE_DICT: {read: 'https://www.googleapis.com/auth/gmail.readonly', compose: 'https://www.googleapis.com/auth/gmail.compose'},
      browser_message_MAX_SIZE: 1024 * 1024, // 1MB
      browser_message_STANDARD_HANDLERS: {
        set_css: function (data) {
          $(data.selector).css(data.css);
        },
      },
      crypto_password_SENTENCE_PRESENT_TEST: /https:\/\/(cryptup\.org|flowcrypt\.com)\/[a-zA-Z0-9]{10}/,
      crypto_password_SENTECES: [
        /This\smessage\sis\sencrypted.+\n\n?/gm, // todo - should be in a common place as the code that generated it
        /.*https:\/\/(cryptup\.org|flowcrypt\.com)\/[a-zA-Z0-9]{10}.*\n\n?/gm,
      ],
      crypto_password_GUESSES_PER_SECOND: 10000 * 2 * 4000, //(10k pc)*(2 core p/pc)*(4k guess p/core) httpshttps://www.abuse.ch/?p=3294://threatpost.com/how-much-does-botnet-cost-022813/77573/ https://www.abuse.ch/?p=3294 
      crypto_password_CRACK_TIME_WORDS: [
        ['millenni', 'perfect', 100, 'green', true],
        ['centu', 'great', 80, 'green', true],
        ['year', 'good', 60, 'orange', true],
        ['month', 'reasonable', 40, 'darkorange', true],
        ['day', 'poor', 20, 'darkred', false],
        ['', 'weak', 10, 'red', false],
      ], // word search, word rating, bar percent, color, pass
      google_oauth2: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest ? (chrome.runtime.getManifest() as any as FlowCryptManifest).oauth2 : null,
      api_google_AUTH_RESPONDED: 'RESPONDED',
    },
    // meant to be used privately within this file like so: tool._.???
    str_base64url_utf_encode: (str) => { // https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
      return (typeof str === 'undefined') ? str : btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    str_base64url_utf_decode: (str) => { // https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
      return (typeof str === 'undefined') ? str : decodeURIComponent(Array.prototype.map.call(atob(str.replace(/-/g, '+').replace(/_/g, '/')), function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''));
    },
    mime_node_type: (node) => {
      if(node.headers['content-type'] && node.headers['content-type'][0]) {
        return node.headers['content-type'][0].value;
      }
    },
    mime_node_filename: (node) => {
      if(node.headers['content-disposition'] && node.headers['content-disposition'][0] && node.headers['content-disposition'][0].params && node.headers['content-disposition'][0].params.filename) {
        return node.headers['content-disposition'][0].params.filename;
      }
      if(node.headers['content-type'] && node.headers['content-type'][0] && node.headers['content-type'][0].params && node.headers['content-type'][0].params.name) {
        return node.headers['content-type'][0].params.name;
      }
    },
    mime_content_node: (MimeBuilder, type, content) => {
      let node = new MimeBuilder(type).setContent(content);
      if(type === 'text/plain') {
        node.addHeader('Content-Transfer-Encoding', 'quoted-printable'); // gmail likes this
      }
      return node;
    },
    mime_require: (group, callback) => {
      if(group === 'parser') {
        // @ts-ignore
        if(typeof MimeParser !== 'undefined') { // browser
          // @ts-ignore
          callback(MimeParser);
        } else if (typeof exports === 'object') { // electron
          callback(require('emailjs-mime-parser'));
        } else { // RequireJS
          tool.env.set_up_require();
          // @ts-ignore
          require(['emailjs-mime-parser'], callback);
        }
      } else {
        // @ts-ignore
        if(typeof MimeBuilder !== 'undefined') { // browser
          // @ts-ignore
          callback(MimeBuilder);
        } else if (typeof exports === 'object') { // electron
          callback(require('emailjs-mime-builder'));
        } else { // RequireJS
          tool.env.set_up_require();
          // @ts-ignore
          require(['emailjs-mime-builder'], callback);
        }
      }
    },
    browser_message_destination_parse: (destination_string) => {
      let parsed = { tab: null, frame: null };
      if(destination_string) {
        parsed.tab = Number(destination_string.split(':')[0]);
        parsed.frame = !isNaN(destination_string.split(':')[1]) ? Number(destination_string.split(':')[1]) : null;
      }
      return parsed;
    },
    crypto_armor_block_object: (type, content, missing_end=false) => ({type: type, content: content, complete: !missing_end}),
    crypto_armor_detect_block_next: (original_text, start_at) => {
      let result = {found: [], continue_at: null};
      let begin = original_text.indexOf(tool.crypto.armor.headers(null).begin, start_at);
      if(begin !== -1) { // found
        let potential_begin_header = original_text.substr(begin, tool._.var.crypto_armor_header_MAX_LENGTH);
        tool.each(tool._.var.crypto_armor_headers_DICT, function(type, block_header) {
          if(block_header.replace) {
            let index_of_confirmed_begin = potential_begin_header.indexOf(block_header.begin);
            if(index_of_confirmed_begin === 0 || (type === 'password_message' && index_of_confirmed_begin < 15)) { // identified beginning of a specific block
              if(begin > start_at) {
                let potential_text_before_block_begun = original_text.substring(start_at, begin).trim();
                if(potential_text_before_block_begun) {
                  result.found.push(tool._.crypto_armor_block_object('text', potential_text_before_block_begun));
                }
              }
              let end;
              if(typeof block_header.end === 'string') {
                end = original_text.indexOf(block_header.end, begin + block_header.begin.length);
              } else { // regexp
                end = original_text.match(block_header.end);
                end = end || -1; // useful below to mimic indexOf
                if(end !== -1) {
                  block_header.end.length = end[0].length; // another hack to mimic results of indexOf
                  end = end.index; // one more
                }
              }
              if(end !== -1) { // identified end of the same block
                if(type !== 'password_message') {
                  result.found.push(tool._.crypto_armor_block_object(type, original_text.substring(begin, end + block_header.end.length).trim()));
                } else {
                  let pm_full_text = original_text.substring(begin, end + block_header.end.length).trim();
                  let pm_short_id_match = pm_full_text.match(/[a-zA-Z0-9]{10}$/);
                  if(pm_short_id_match) {
                    result.found.push(tool._.crypto_armor_block_object(type, pm_short_id_match[0]));
                  } else {
                    result.found.push(tool._.crypto_armor_block_object('text', pm_full_text));
                  }
                }
                result.continue_at = end + block_header.end.length;
              } else { // corresponding end not found
                result.found.push(tool._.crypto_armor_block_object(type, original_text.substr(begin), true));
              }
              return false;
            }
          }
        });
      } else {
        let potential_text = original_text.substr(start_at).trim();
        if(potential_text) {
          result.found.push(tool._.crypto_armor_block_object('text', potential_text));
        }
      }
      return result;
    },
    crypto_hash_sha256_loop: (string, times=100000) => {
      for(let i = 0; i < times; i++) {
        string = tool.crypto.hash.sha256(string);
      }
      return string;
    },
    crypto_key_ids: (armored_pubkey) => openpgp.key.readArmored(armored_pubkey).keys[0].getKeyIds(),
    crypto_message_get_sorted_keys_for_message: (account_email, message, callback) => {
      let keys = {
        verification_contacts: [],
        for_verification: [],
        encrypted_for: [],
        signed_by: [],
        potentially_matching: [],
        with_passphrases: [],
        without_passphrases: [],
      };
      if(message.getEncryptionKeyIds) {
        keys.encrypted_for = (message.getEncryptionKeyIds() || []).map(function (id) {
          return tool.crypto.key.longid(id.bytes);
        });
      }
      keys.signed_by = (message.getSigningKeyIds() || []).filter(function(id) { return Boolean(id); }).map(function (id) {
        return tool.crypto.key.longid(id.bytes);
      });
      storage.keys_get(account_email).then(function(private_keys_all) {
        keys.potentially_matching = private_keys_all.filter(function(ki) { return tool.value(ki.longid).in(keys.encrypted_for)});
        if(keys.potentially_matching.length === 0) { // not found any matching keys, or list of encrypted_for was not supplied in the message. Just try all keys.
          keys.potentially_matching = private_keys_all;
        }
        Promise.all(keys.potentially_matching.map(function(ki) {return storage.passphrase_get(account_email, ki.longid)})).then(function(passphrases) {
          tool.each(keys.potentially_matching, function (i, ki) {
            if(passphrases[i] !== null) {
              let key = openpgp.key.readArmored(ki.private).keys[0];
              if(tool.crypto.key.decrypt(key, passphrases[i]).success) {
                ki.decrypted = key;
                keys.with_passphrases.push(ki);
              } else {
                keys.without_passphrases.push(ki);
              }
            } else {
              keys.without_passphrases.push(ki);
            }
          });
          if(keys.signed_by.length && typeof storage.db_contact_get === 'function') {
            storage.db_contact_get(null, keys.signed_by, function (verification_contacts) {
              keys.verification_contacts = verification_contacts.filter(function (contact) {
                return contact !== null;
              });
              keys.for_verification = [].concat.apply([], keys.verification_contacts.map(function (contact) {
                return openpgp.key.readArmored(contact.pubkey).keys;
              }));
              callback(keys);
            });
          } else {
            callback(keys);
          }
        });
      });
    },
    crypto_message_zeroed_decrypt_error_counts: (keys=null) => {
      return {
        decrypted: 0,
        potentially_matching_keys: keys ? keys.potentially_matching.length : 0,
        rounds: keys ? keys.with_passphrases.length : 0,
        attempts: 0,
        key_mismatch: 0,
        wrong_password: 0,
        unsecure_mdc: 0,
        format_errors: 0,
      };
    },
    crypto_message_increment_decrypt_error_counts: (counts, other_errors, one_time_message_password, decrypt_error) => {
      if(String(decrypt_error) === 'Error: Error decrypting message: Cannot read property \'isDecrypted\' of null' && !one_time_message_password) {
        counts.key_mismatch++; // wrong private key
      } else if(String(decrypt_error) === 'Error: Error decrypting message: Invalid session key for decryption.' && !one_time_message_password) {
        counts.key_mismatch++; // attempted opening password only message with key
      } else if(one_time_message_password && tool.value(String(decrypt_error)).in(['Error: Error decrypting message: Invalid enum value.', 'Error: Error decrypting message: CFB decrypt: invalid key'])) {
        counts.wrong_password++; // wrong password
      } else if(String(decrypt_error) === 'Error: Error decrypting message: Decryption failed due to missing MDC in combination with modern cipher.') {
        counts.unsecure_mdc++;
      } else if (String(decrypt_error) === 'Error: Error decrypting message: Decryption error') {
        counts.format_errors++; // typically
      } else {
        other_errors.push(String(decrypt_error));
      }
      counts.attempts++;
    },
    /**
     *
     * @param callback: callback function / listener
     * @param result: result to be called back
     * @returns {boolean}: continue to next attempt
     */
    crypto_message_chained_decryption_result_collector: (callback, result) => {
      if(result.success) {
        callback(result); // callback the moment there is successful decrypt
        return false; // do not try again
      } else if(result.counts.attempts === result.counts.rounds && !result.counts.decrypted) {
        if(result.counts.format_errors > 0) {
          result.format_error = 'This message seems to be badly formatted.';
        }
        callback(result); // or callback if no success and this was the last attempt
        return false; // do not try again
      }
      return true; // next attempt
    },
    crypto_message_get_decrypt_options: (message, ki, is_armored, one_time_message_password, force_output_format=null) => {
      let options = {
        message: message, 
        format: is_armored ? (force_output_format || 'utf8') : (force_output_format || 'binary'),
      };
      if(!one_time_message_password) {
        options['privateKey'] = ki.decrypted;
      } else {
        options['password'] = tool.crypto.hash.challenge_answer(one_time_message_password);
      }
      return options;
    },
    crypto_key_patch_public_keys_to_ignore_expiration: (keys) => {
      let openpgpjs_original_isValidEncryptionKeyPacket = function(keyPacket, signature) {
        return keyPacket.algorithm !== openpgp.enums.read(openpgp.enums.publicKey, openpgp.enums.publicKey.dsa) && keyPacket.algorithm !== openpgp.enums.read(openpgp.enums.publicKey, openpgp.enums.publicKey.rsa_sign) && (!signature.keyFlags || (signature.keyFlags[0] & openpgp.enums.keyFlags.encrypt_communication) !== 0 || (signature.keyFlags[0] & openpgp.enums.keyFlags.encrypt_storage) !== 0);
      };
      tool.each(keys, function (i, key) {
        tool.each(key.subKeys || [], function (i, sub_key) {
          sub_key.isValidEncryptionKey = function (primaryKey) {
            let verifyResult = this.verify(primaryKey);
            if (verifyResult !== openpgp.enums.keyStatus.valid && verifyResult !== openpgp.enums.keyStatus.expired) {
              return false;
            }
            for (let i = 0; i < this.bindingSignatures.length; i++) {
              if (openpgpjs_original_isValidEncryptionKeyPacket(this.subKey, this.bindingSignatures[i])) {
                return true;
              }
            }
            return false;
          };
        });
      });
    },
    readable_crack_time: (total_seconds) => { // http://stackoverflow.com/questions/8211744/convert-time-interval-given-in-seconds-into-more-human-readable-form
      function numberEnding(number) {
        return(number > 1) ? 's' : '';
      }
      total_seconds = Math.round(total_seconds);
      let millennia = Math.round(total_seconds / (86400 * 30 * 12 * 100 * 1000));
      if(millennia) {
        return millennia === 1 ? 'a millennium' : 'millennia';
      }
      let centuries = Math.round(total_seconds / (86400 * 30 * 12 * 100));
      if(centuries) {
        return centuries === 1 ? 'a century' : 'centuries';
      }
      let years = Math.round(total_seconds / (86400 * 30 * 12));
      if(years) {
        return years + ' year' + numberEnding(years);
      }
      let months = Math.round(total_seconds / (86400 * 30));
      if(months) {
        return months + ' month' + numberEnding(months);
      }
      let days = Math.round(total_seconds / 86400);
      if(days) {
        return days + ' day' + numberEnding(days);
      }
      let hours = Math.round(total_seconds / 3600);
      if(hours) {
        return hours + ' hour' + numberEnding(hours);
      }
      let minutes = Math.round(total_seconds / 60);
      if(minutes) {
        return minutes + ' minute' + numberEnding(minutes);
      }
      let seconds = total_seconds % 60;
      if(seconds) {
        return seconds + ' second' + numberEnding(seconds);
      }
      return 'less than a second';
    },
    get_ajax_progress_xhr: (progress_callbacks) => {
      let progress_reporting_xhr = new (window as FlowCryptWindow).XMLHttpRequest();
      if(typeof progress_callbacks.upload === 'function') {
        progress_reporting_xhr.upload.addEventListener('progress', function(evt) {
          progress_callbacks.upload(evt.lengthComputable ? Math.round((evt.loaded / evt.total) * 100) : null);
        }, false);
      }
      if(typeof progress_callbacks.download === 'function') {
        progress_reporting_xhr.onprogress = function (evt) {
          progress_callbacks.download(evt.lengthComputable ? Math.floor((evt.loaded / evt.total) * 100) : null, evt.loaded, evt.total);
        };
      }
      return progress_reporting_xhr;
    },
    api_call: (base_url, path, values, format, progress, headers=undefined, response_format='json', method='POST') => {
      progress = progress || {};
      let formatted_values;
      let content_type;
      if(format === 'JSON' && values !== null) {
        formatted_values = JSON.stringify(values);
        content_type = 'application/json; charset=UTF-8';
      } else if(format === 'FORM') {
        formatted_values = new FormData();
        tool.each(values, function (name, value) {
          if(typeof value === 'object' && value.name && value.content && value.type) {
            formatted_values.append(name, new Blob([value.content], { type: value.type }), value.name); // todo - type should be just app/pgp? for privacy
          } else {
            formatted_values.append(name, value);
          }
        });
        content_type = false;
      } else {
        throw Error('unknown format:' + String(format));
      }
      return tool.catch.Promise(function(resolve, reject) {
        $.ajax({
          xhr: function() {
            return tool._.get_ajax_progress_xhr(progress);
          },
          url: base_url + path,
          method: method,
          data: formatted_values,
          dataType: response_format,
          crossDomain: true,
          headers: headers,
          processData: false,
          contentType: content_type,
          async: true,
          timeout: typeof progress.upload === 'function' || typeof progress.download === 'function' ? undefined : 20000,
          success: function (response) {
            tool.catch.try(function () {
              if(response && typeof response === 'object' && typeof response.error === 'object') {
                reject(response.error);
              } else {
                resolve(response);
              }
            })();
          },
          error: function (XMLHttpRequest, status, error) {
            tool.catch.try(function () {
              if(XMLHttpRequest.status === 0) {
                reject({code: null, message: 'Internet connection not available', internal: 'network'});
              } else {
                reject({code: XMLHttpRequest.status, message: String(error)});
              }
            })();
          },
        });
      });
    },
    api_google_has_new_scope: (new_scopes, original_scopes, omit_read_scope) => {
      if(!(original_scopes || []).length) { // no original scopes
        return true;
      }
      if(!(new_scopes || []).length) { // no new scopes specified
        return(original_scopes.length === 2 && !omit_read_scope); // however, previously there were only two of three scopes, and third was not omitted this time
      }
      for(let i = 0; i < new_scopes.length; i++) {
        if(!tool.value(new_scopes[i]).in(original_scopes)) {
          return true; // found a new scope
        }
      }
      return false; // no new scope found
    },
    api_google_auth_state_pack: (status_object) => tool._.var.google_oauth2.state_header + JSON.stringify(status_object),
    api_google_auth_code_url: (auth_request) => {
      return tool.env.url_create(tool._.var.google_oauth2.url_code, {
        client_id: tool._.var.google_oauth2.client_id,
        response_type: 'code',
        access_type: 'offline',
        state: tool._.api_google_auth_state_pack(auth_request),
        redirect_uri: tool._.var.google_oauth2.url_redirect,
        scope: auth_request.scopes.join(' '),
        login_hint: auth_request.account_email,
      });
    },
    google_auth_save_tokens: (account_email, tokens_object, scopes, callback) => {
      let to_save = {
        google_token_access: tokens_object.access_token,
        google_token_expires: new Date().getTime() + tokens_object.expires_in * 1000,
        google_token_scopes: scopes,
      };
      if(typeof tokens_object.refresh_token !== 'undefined') {
        to_save['google_token_refresh'] = tokens_object.refresh_token;
      }
      storage.set(account_email, to_save, callback);
    },
    google_auth_get_tokens: (code, callback, retries_left) => {
      $.ajax({
        url: tool.env.url_create(tool._.var.google_oauth2.url_tokens, { grant_type: 'authorization_code', code: code, client_id: tool._.var.google_oauth2.client_id, redirect_uri: tool._.var.google_oauth2.url_redirect }),
        method: 'POST',
        crossDomain: true,
        async: true,
        success: function (response) {
          callback(response);
        },
        error: function (XMLHttpRequest, status, error) {
          if(!retries_left) {
            callback({ request: XMLHttpRequest, status: status, error: error });
          } else {
            setTimeout(function () { // retry again
              tool._.google_auth_get_tokens(code, callback, retries_left - 1);
            }, 2000);
          }
        },
      });
    },
    google_auth_refresh_token: (refresh_token, callback) => {
      $.ajax({
        url: tool.env.url_create(tool._.var.google_oauth2.url_tokens, { grant_type: 'refresh_token', refresh_token: refresh_token, client_id: tool._.var.google_oauth2.client_id }),
        method: 'POST',
        crossDomain: true,
        async: true,
        success: function (response) {
          callback(true, response);
        },
        error: function (XMLHttpRequest, status, error) {
          if(XMLHttpRequest.status === 0 && status === 'error') { // connection error
            callback(false, tool.api.error.network);
          } else {
            callback(false, { request: XMLHttpRequest, status: status, error: error });
          }
        },
      });
    },
    google_auth_check_email: (expected_email, access_token, callback) => {
      $.ajax({
        url: 'https://www.googleapis.com/gmail/v1/users/me/profile',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + access_token },
        crossDomain: true,
        contentType: 'application/json; charset=UTF-8',
        async: true,
        success: function (response) {
          callback(response.emailAddress);
        },
        error: function (response) {
          console.log('google_auth_check_email error');
          console.log(expected_email);
          console.log(response);
          callback(expected_email); //todo - handle better. On a network error, this could result in saving this wrongly. Should re-try two times with some delay, then call back.
        },
      });
    },
    google_auth_window_result_handler: (expected_responder_id, result, close_auth_window) => {
      if(result.state.auth_responder_id === expected_responder_id) {
        let auth_responder = tool._.var.api_google_auth_responders[result.state.auth_responder_id];
        if(auth_responder !== tool._.var.api_google_AUTH_RESPONDED) {
          tool._.var.api_google_auth_responders[result.state.auth_responder_id] = tool._.var.api_google_AUTH_RESPONDED;
          close_auth_window();
          switch(result.result) {
            case 'Success':
            tool._.google_auth_get_tokens(result.params.code, function (tokens_object) {
                if(typeof tokens_object.access_token !== 'undefined') {
                  tool._.google_auth_check_email(result.state.account_email, tokens_object.access_token, function (account_email) {
                    tool._.google_auth_save_tokens(account_email, tokens_object, result.state.scopes, function () {
                      auth_responder({account_email: account_email, success: true, result: 'success', message_id: result.state.message_id});
                    });
                  });
                } else { // got code but failed to use the code to fetch tokens
                  auth_responder({success: false, result: 'success', account_email: result.state.account_email, message_id: result.state.message_id});
                }
              }, 2);
              break;
            case 'Denied':
              auth_responder({success: false, result: 'denied', error: result.params.error, account_email: result.state.account_email, message_id: result.state.message_id});
              break;
            case 'Error':
              auth_responder({success: false, result: 'error', error: result.params.error, account_email: result.state.account_email, message_id: result.state.message_id});
              break;
          }
        } else {
          console.log('Ignoring expected_responder_id ' + expected_responder_id + ': API_GOOGLE_AUTH_RESPONDED previously');
        }
      }
    },
    api_google_call: (account_email, method, url, parameters, callback, fail_on_auth=false) => {
      storage.get(account_email, ['google_token_access', 'google_token_expires'], function (auth) {
        let data = method === 'GET' || method === 'DELETE' ? parameters : JSON.stringify(parameters);
        if(typeof auth.google_token_access !== 'undefined' && auth.google_token_expires > new Date().getTime()) { // have a valid gmail_api oauth token
          $.ajax({
            url: url,
            method: method,
            data: data,
            headers: { 'Authorization': 'Bearer ' + auth.google_token_access },
            crossDomain: true,
            contentType: 'application/json; charset=UTF-8',
            async: true,
            success: function (response) {
              tool.catch.try(function () {
                callback(true, response);
              })();
            },
            error: function (response) {
              try {
                let error_obj = JSON.parse(response.responseText);
                if(typeof error_obj.error !== 'undefined' && error_obj.error.message === 'Invalid Credentials') {
                  tool._.google_api_handle_auth_error(account_email, method, url, parameters, callback, fail_on_auth, response, tool._.api_google_call);
                } else {
                  response['_error'] = error_obj.error;
                  tool.catch.try(function () {
                    callback(false, response);
                  })();
                }
              } catch(err) {
                tool.catch.try(function () {
                  response['_error'] = {};
                  let re_title = /<title>([^<]+)<\/title>/mgi;
                  let title_match = re_title.exec(response.responseText);
                  if(title_match) {
                    response['_error'].message = title_match[1];
                  }
                  callback(false, response);
                })();
              }
            },
          });
        } else { // no valid gmail_api oauth token
          tool._.google_api_handle_auth_error(account_email, method, url, parameters, callback, fail_on_auth, null, tool._.api_google_call);
        }
      });
    },
    api_gmail_call: (account_email, method, resource, parameters, callback, fail_on_auth=false, progress=null, content_type=null) => {
      if(!account_email) {
        throw new Error('missing account_email in api_gmail_call');
      }
      progress = progress || {};
      storage.get(account_email, ['google_token_access', 'google_token_expires'], function (auth) {
        if(typeof auth.google_token_access !== 'undefined' && auth.google_token_expires > new Date().getTime()) { // have a valid gmail_api oauth token
          let data, url;
          if(typeof progress.upload === 'function') {
            url = 'https://www.googleapis.com/upload/gmail/v1/users/me/' + resource + '?uploadType=multipart';
            data = parameters;
          } else {
            url = 'https://www.googleapis.com/gmail/v1/users/me/' + resource;
            if(method === 'GET' || method === 'DELETE') {
              data = parameters;
            } else {
              data = JSON.stringify(parameters);
            }
          }
          $.ajax({
            xhr: function () {
              return tool._.get_ajax_progress_xhr(progress);
            },
            url: url,
            method: method,
            data: data,
            headers: { 'Authorization': 'Bearer ' + auth.google_token_access },
            crossDomain: true,
            contentType: content_type || 'application/json; charset=UTF-8',
            async: true,
            success: function (response) {
              tool.catch.try(function () {
                if(callback) {
                  callback(true, response);
                }
              })();
            },
            error: function (response) {
              try {
                let error_obj = JSON.parse(response.responseText);
                if(typeof error_obj.error !== 'undefined' && error_obj.error.message === 'Invalid Credentials') {
                  tool._.google_api_handle_auth_error(account_email, method, resource, parameters, callback, fail_on_auth, response, tool._.api_gmail_call, progress, content_type);
                } else {
                  response['_error'] = error_obj.error;
                  if(callback) {
                    tool.catch.try(function () {
                      callback(false, response);
                    })();
                  }
                }
              } catch(err) {
                tool.catch.try(function () {
                  response['_error'] = {};
                  let re_title = /<title>([^<]+)<\/title>/mgi;
                  let title_match = re_title.exec(response.responseText);
                  if(title_match) {
                    response['_error'].message = title_match[1];
                  }
                  if(callback) {
                    callback(false, response);
                  }
                })();
              }
            },
          });
        } else { // no valid gmail_api oauth token
          tool._.google_api_handle_auth_error(account_email, method, resource, parameters, callback, fail_on_auth, null, tool._.api_gmail_call, progress, content_type);
        }
      });
    },
    google_api_handle_auth_error: (account_email, method, resource, parameters, callback, fail_on_auth, error_response, base_api_function, progress=null, content_type=null) => {
      if(fail_on_auth !== true) {
        tool.api.google.auth({ account_email: account_email }, function (response) {
          if(response && response.success === false && response.error === tool.api.error.network) {
            callback(false, tool.api.error.network);
          } else { //todo: error handling for other bad situations
            base_api_function(account_email, method, resource, parameters, callback, true, progress, content_type);
          }
        });
      } else {
        callback(false, error_response);
      }
    },
    encode_as_multipart_related: (parts) => { // todo - this could probably be achieved with emailjs-mime-builder
      let boundary = 'this_sucks_' + tool.str.random(10);
      let body = '';
      tool.each(parts, function(type, data) {
        body += '--' + boundary + '\n';
        body += 'Content-Type: ' + type + '\n';
        if(tool.value('json').in(type)) {
          body += '\n' + data + '\n\n';
        } else {
          body += 'Content-Transfer-Encoding: base64\n';
          body += '\n' + btoa(data) + '\n\n';
        }
      });
      body += '--' + boundary + '--';
      return { content_type: 'multipart/related; boundary=' + boundary, body: body };
    },
    api_gmail_loop_through_emails_to_compile_contacts: (account_email, query, callback, results=[]) => {
      tool.api.gmail.fetch_messages_based_on_query_and_extract_first_available_header(account_email, query, ['to', 'date'], function (headers) {
        if(headers && headers.to) {
          let result = headers.to.split(/, ?/).map(tool.str.parse_email).map(function (r) {
            r.date = headers.date;
            return r;
          });
          let add_filter = result.map(function (email) {
            return ' -to:"' + email.email + '"';
          }).join('');
          results = results.concat(result);
          callback({ new: result, all: results, });
          tool._.api_gmail_loop_through_emails_to_compile_contacts(account_email, query + add_filter, callback, results);
        } else {
          callback({ new: [], all: results, });
        }
      });
    },
    api_gmail_fetch_messages_sequentially_from_list_and_extract_first_available_header: (account_email, messages, header_names, callback, i=0) => {
      tool.api.gmail.message_get(account_email, messages[i].id, 'metadata', function (success, message_get_response) {
        let header_values = {};
        let missing_header = false;
        if(success) { // non-mission critical - just skip failed requests
          tool.each(header_names, function (i, header_name) {
            header_values[header_name] = tool.api.gmail.find_header(message_get_response, header_name);
            if(!header_values[header_name]) {
              missing_header = true;
            }
          });
        }
        if(!missing_header) {
          callback(header_values);
        } else if(i + 1 < messages.length) {
          tool._.api_gmail_fetch_messages_sequentially_from_list_and_extract_first_available_header(account_email, messages, header_names, callback, i + 1);
        } else {
          callback();
        }
      });
    },
    api_attester_call: (path, values) => tool._.api_call('https://attester.flowcrypt.com/', path, values, 'JSON', null, {'api-version': 3}),
    // api_attester_call: (path, values) => tool._.api_call('http://127.0.0.1:5002/', path, values, 'JSON', null, {'api-version': 3}),
    api_attester_packet_armor: (content_text) => `${tool.crypto.armor.headers('attest_packet').begin}\n${content_text}\n${tool.crypto.armor.headers('attest_packet').end}`,
    api_cryptup_call: (path, values, format='JSON') => tool._.api_call(tool.api.cryptup.url('api'), path, values, format, null, {'api-version': 3}),
    // api_cryptup_call: (path, values, format='JSON') => tool._.api_call('http://127.0.0.1:5001/, path, values, format, null, {'api-version': 3}),
  },
  catch: { // web and extension code
    handle_error: (error_message, url, line, col, error, is_manually_called, version, env) => {
      if(typeof error === 'string') {
        error_message = error;
        error = { name: 'thrown_string', message: error_message, stack: error_message };
      }
      if(error_message && url && typeof line !== 'undefined' && !col && !error && !is_manually_called && !version && !env) { // safari has limited support
        error = { name: 'safari_error', message: error_message, stack: error_message };
      }
      if(typeof error_message === 'undefined' && line === 0 && col === 0 && is_manually_called && typeof error === 'object' && !(error instanceof Error)) {
        let stringified;
        try { // this sometimes happen with unhandled Promise.then(_, reject)
          stringified = JSON.stringify(error);
        } catch(cannot) {
          stringified = 'typeof: ' + (typeof error) + '\n' + String(error);
        }
        error = { name: 'thrown_object', message: error.message || '(unknown)', stack: stringified};
        error_message = 'thrown_object'
      }
      let user_log_message = ' Please report errors above to human@flowcrypt.com. I fix errors VERY promptly.';
      let ignored_errors = [
        'Invocation of form get(, function) doesn\'t match definition get(optional string or array or object keys, function callback)', // happens in gmail window when reloaded extension + now reloading gmail
        'Invocation of form set(, function) doesn\'t match definition set(object items, optional function callback)', // happens in gmail window when reloaded extension + now reloading gmail
        'Invocation of form runtime.connect(null, ) doesn\'t match definition runtime.connect(optional string extensionId, optional object connectInfo)',
      ];
      if(!error) {
        return;
      }
      if(ignored_errors.indexOf(error.message) !== -1) {
        return true;
      }
      if(error.stack) {
        console.log('%c[' + error_message + ']\n' + error.stack, 'color: #F00; font-weight: bold;');
      } else {
        console.log('%c' + error_message, 'color: #F00; font-weight: bold;');
      }
      if(is_manually_called !== true && tool.catch._.original_on_error && tool.catch._.original_on_error !== (tool.catch.handle_error as any as ErrorEventHandler)) {
        tool.catch._.original_on_error.apply(this, arguments); // Call any previously assigned handler
      }
      if((error.stack || '').indexOf('PRIVATE') !== -1) {
        return;
      }
      try {
        $.ajax({
          url: 'https://flowcrypt.com/api/help/error',
          method: 'POST',
          data: JSON.stringify({
            name: (error.name || '').substring(0, 50),
            message: (error_message || '').substring(0, 200),
            url: (url || '').substring(0, 100),
            line: line || 0,
            col: col || 0,
            trace: error.stack || '',
            version: version || tool.catch.version() || 'unknown',
            environment: env || tool.catch.environment(),
          }),
          dataType: 'json',
          crossDomain: true,
          contentType: 'application/json; charset=UTF-8',
          async: true,
          success: function (response) {
            if(response.saved === true) {
              console.log('%cFlowCrypt ERROR:' + user_log_message, 'font-weight: bold;');
            } else {
              console.log('%cFlowCrypt EXCEPTION:' + user_log_message, 'font-weight: bold;');
            }
          },
          error: function (XMLHttpRequest, status, error) {
            console.log('%cFlowCrypt FAILED:' + user_log_message, 'font-weight: bold;');
          },
        });
      } catch(ajax_err) {
        console.log(ajax_err.message);
        console.log('%cFlowCrypt ISSUE:' + user_log_message, 'font-weight: bold;');
      }
      try {
        if(typeof storage.get === 'function' && typeof storage.set === 'function') {
          storage.get(null, ['errors'], function (s) {
            if(typeof s.errors === 'undefined') {
              s.errors = [];
            }
            s.errors.unshift(error.stack || error_message);
            storage.set(null, s);
          });
        }
      } catch (storage_err) {
        console.log('failed to locally log error "' + String(error_message) + '" because: ' + storage_err.message);
      }
      return true;
    },
    handle_exception: (exception) => {
      let line, col;
      try {
        let caller_line = exception.stack.split('\n')[1];
        let matched = caller_line.match(/\.js:([0-9]+):([0-9]+)\)?/);
        line = Number(matched[1]);
        col = Number(matched[2]);
      } catch(line_err) {
        line = 0;
        col = 0;
      }
      tool.catch._.runtime = tool.catch._.runtime || {};
      tool.catch.handle_error(exception.message, window.location.href, line, col, exception, true, tool.catch._.runtime['version'], tool.catch._.runtime['environment']);
    },
    report: (name, details=undefined) => {
      try {
        throw new Error(name);
      } catch(e) {
        if(typeof details !== 'string') {
          try {
            details = JSON.stringify(details);
          } catch(stringify_error) {
            details = '(could not stringify details "' + String(details) + '" in tool.catch.report because: ' + stringify_error.message + ')';
          }
        }
        e.stack = e.stack + '\n\n\ndetails: ' + details;
        tool.catch.handle_exception(e);
      }
    },
    log: (name, details=undefined) => {
      name = 'tool.catch.log: ' + name;
      console.log(name);
      try {
        throw new Error(name);
      } catch(e) {
        if(typeof details !== 'string') {
          try {
            details = JSON.stringify(details);
          } catch(stringify_error) {
            details = '(could not stringify details "' + String(details) + '" in tool.catch.log because: ' + stringify_error.message + ')';
          }
        }
        e.stack = e.stack + '\n\n\ndetails: ' + details;
        try {
          storage.get(null, ['errors'], function (s) {
            if(typeof s.errors === 'undefined') {
              s.errors = [];
            }
            s.errors.unshift(e.stack || name);
            storage.set(null, s);
          });
        } catch (storage_err) {
          console.log('failed to locally log info "' + String(name) + '" because: ' + storage_err.message);
        }
      }
    },
    version: (format='original') => {
      if(format === 'int') {
        return tool.catch._.runtime['version'] ? Number(tool.catch._.runtime['version'].replace(/\./g, '')) : null;
      } else {
        return tool.catch._.runtime['version'] || null;
      }
    },
    try: (code) => {
      return function () {
        try {
          return code();
        } catch(code_err) {
          tool.catch.handle_exception(code_err);
        }
      };
    },
    environment: (url=window.location.href) => {
      let browser_name = tool.env.browser().name;
      let env = 'unknown';
      if(url.indexOf('bnjglocicd') !== -1) {
        env = 'ex:prod';
      } else if(url.indexOf('nmelpmhpel') !== -1 || url.indexOf('blfdgihad') !== -1) {
        env = 'ex:dev';
      } else if(url.indexOf('himcfccebk') !== -1) {
        env = 'ex:test';
      } else if (url.indexOf('l.flowcrypt.com') !== -1 || url.indexOf('127.0.0.1') !== -1) {
        env = 'web:local';
      } else if (url.indexOf('cryptup.org') !== -1 || url.indexOf('flowcrypt.com') !== -1) {
        env = 'web:prod';
      } else if (/chrome-extension:\/\/[a-z]{32}\/.+/.test(url)) {
        env = 'ex:fork';
      } else if (url.indexOf('mail.google.com') !== -1) {
        env = 'ex:script:gmail';
      } else if (url.indexOf('inbox.google.com') !== -1) {
        env = 'ex:script:inbox';
      } else if (/moz-extension:\/\/.+/.test(url)) {
        env = 'ex';
      }
      return browser_name + ':' + env;
    },
    test: () => {
      // @ts-ignore
      this_will_fail();
    }
  ,
    Promise: (f) => {
      return new Promise(function(resolve, reject) {
        try {
          f(resolve, reject);
        } catch(e) {
          tool.catch.handle_exception(e);
          reject({code: null, message: 'Error happened, please write me at human@flowcrypt.com to fix this\n\nError: ' + e.message, internal: 'exception'});
        }
      })
    },
    promise_error_alert: (note) => {
      return function (error) {
        console.log(error);
        alert(note);
      };
    },
    stack_trace: () => {
      try {
        tool.catch.test();
      } catch(e) {
        return e.stack.split('\n').splice(3).join('\n'); // return stack after removing first 3 lines
      }
    },
    handle_promise_error: (e) => {
      if(e && typeof e === 'object' && typeof e.reason === 'object' && e.reason.message) {
        tool.catch.handle_exception(e.reason); // actual exception that happened in Promise, unhandled
      } else if(!tool.value(JSON.stringify(e)).in(['{"isTrusted":false}', '{"isTrusted":true}'])) {  // unrelated to FlowCrypt, has to do with JS-initiated clicks/events
        tool.catch.report('unhandled_promise_reject_object', e); // some x that was called with reject(x) and later not handled
      }
    },
    _: {
      runtime: {},
      original_on_error: window.onerror,
      initialize: () => {
        figure_out_flowcrypt_runtime();

        (window as FlowCryptWindow).onerror = (tool.catch.handle_error as any as ErrorEventHandler);
        (window as FlowCryptWindow).onunhandledrejection = tool.catch.handle_promise_error;
      
        function figure_out_flowcrypt_runtime() {
          if((window as FlowCryptWindow).is_bare_engine !== true) {
            try {
              tool.catch._.runtime['version'] = chrome.runtime.getManifest().version;
            } catch(err) {
            }
            tool.catch._.runtime['environment'] = tool.catch.environment();
            if(!tool.env.is_background_script() && tool.env.is_extension()) {
              tool.browser.message.send(null, 'runtime', null, function (extension_runtime) {
                if(typeof extension_runtime !== 'undefined') {
                  tool.catch._.runtime = extension_runtime;
                } else {
                  setTimeout(figure_out_flowcrypt_runtime, 200);
                }
              });
            }
          }
        }
      },
    }
  },
};

tool.catch._.initialize();
let catcher = tool.catch; // legacy code expects this

(function ( /* EXTENSIONS AND CONFIG */ ) {

  if(typeof (window as FlowCryptWindow).openpgp !== 'undefined' && typeof (window as FlowCryptWindow).openpgp.config !== 'undefined' && typeof (window as FlowCryptWindow).openpgp.config.versionstring !== 'undefined' && typeof (window as FlowCryptWindow).openpgp.config.commentstring !== 'undefined') {
    (window as FlowCryptWindow).openpgp.config.versionstring = 'FlowCrypt ' + (tool.catch.version() || '') + ' Gmail Encryption flowcrypt.com';
    (window as FlowCryptWindow).openpgp.config.commentstring = 'Seamlessly send, receive and search encrypted email';
    (window as FlowCryptWindow).openpgp.config.ignore_mdc_error = true;  // todo - report back to user once openpgp.js has the functionality https://github.com/openpgpjs/openpgpjs/issues/651
  }

  (RegExp as any).escape = function (s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  };

  String.prototype.repeat = String.prototype.repeat || function(count) {
    if (this == null) {
      throw new TypeError('can\'t convert ' + this + ' to object');
    }
    let str = '' + this;
    count = +count;
    if (count != count) {
      count = 0;
    }
    if (count < 0) {
      throw new RangeError('repeat count must be non-negative');
    }
    if (count == Infinity) {
      throw new RangeError('repeat count must be less than infinity');
    }
    count = Math.floor(count);
    if (str.length == 0 || count == 0) {
      return '';
    }
    // Ensuring count is a 31-bit integer allows us to heavily optimize the
    // main part. But anyway, most current (August 2014) browsers can't handle
    // strings 1 << 28 chars or longer, so:
    if (str.length * count >= 1 << 28) {
      throw new RangeError('repeat count must not overflow maximum string size');
    }
    let rpt = '';
    for (;;) {
      if ((count & 1) == 1) {
        rpt += str;
      }
      count >>>= 1;
      if (count == 0) {
        break;
      }
      str += str;
    }
    // Could we try:
    // return Array(count + 1).join(this);
    return rpt;
  };

  (Promise as any).prototype.validate = (Promise as any).prototype.validate || function(validity_checker) {
    let original_promise = this;
    return tool.catch.Promise(function(resolve, reject) {
      original_promise.then(function(response) {
        if(typeof response === 'object') {
          if(validity_checker(response)) {
            resolve(response);
          } else {
            reject({code: null, message: 'Could not validate result', internal: 'validate'});
          }
        } else {
          reject({code: null, message: 'Could not validate result: not an object', internal: 'validate'});
        }
      }, reject);
    });
  };

  (Promise as any).prototype.done = (Promise as any).prototype.done || function(next) {
    return this.then(function(x) {
      next(true, x);
    }, function(x) {
      next(false, x);
    });
  };

  (Promise as any).sequence = (Promise as any).sequence || function (promise_factories) {
    return tool.catch.Promise(function (resolve, reject) {
      let all_results = [];
      return promise_factories.reduce(function(chained_promises, create_promise) {
        return chained_promises.then(function(promise_result) {
          all_results.push(promise_result);
          return create_promise();
        });
      }, Promise.resolve('remove+me')).then(function(last_promise_result) {
        all_results.push(last_promise_result);
        resolve(all_results.splice(1)); // remove first bogus promise result
      });
    });
  }

})();