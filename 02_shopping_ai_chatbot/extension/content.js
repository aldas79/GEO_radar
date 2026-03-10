(function(){
  if(document.getElementById('shopping-ai-float'))return;
  var root=document.createElement('div');root.id='shopping-ai-float';
  var toggle=document.createElement('button');toggle.id='shopping-ai-toggle';toggle.setAttribute('aria-label','Open AI chatbot');toggle.textContent='[Chat]';
  var iframe=document.createElement('iframe');iframe.src=chrome.runtime.getURL('panel.html');
  root.appendChild(toggle);root.appendChild(iframe);
  toggle.addEventListener('click',function(){root.classList.add('open');});
  iframe.addEventListener('load',function(){iframe.contentWindow.postMessage({type:'PAGE_URL',url:window.location.href},'*');});
  document.body.appendChild(root);
  window.addEventListener('message',function(e){if(e.data&&e.data.type==='CLOSE_FLOAT')root.classList.remove('open');});
})();
