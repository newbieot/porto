(()=>{
const form=document.getElementById('login-form'),error=document.getElementById('login-error'),button=form.querySelector('[type=submit]'),password=document.getElementById('password');
document.getElementById('show-password').addEventListener('click',event=>{const show=password.type==='password';password.type=show?'text':'password';event.currentTarget.textContent=show?'Sembunyikan':'Lihat';event.currentTarget.setAttribute('aria-pressed',String(show));event.currentTarget.setAttribute('aria-label',show?'Sembunyikan password':'Tampilkan password');});
form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;button.textContent='Memeriksa akun…';error.hidden=true;
try {const response=await fetch('/api/finance/login',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:form.email.value.trim(),password:password.value})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Belum berhasil masuk. Coba kembali.');password.value='';location.assign('/finance');}
catch(reason){error.textContent=reason.message;error.hidden=false;button.disabled=false;button.innerHTML='Masuk ke dashboard <span aria-hidden="true">↗</span>';}});
})();
