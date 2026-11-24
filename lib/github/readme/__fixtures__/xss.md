# XSS

<script>alert("script")</script>
<img src="x" onerror="alert('onerror')">
<a href="javascript:alert('href')">click</a>
<a href="  JaVaScRiPt:alert(1)">mixed case</a>
<iframe src="https://evil.example"></iframe>
<svg><script>alert(1)</script></svg>
<div style="background:url(javascript:alert(1))" onclick="alert(1)">styled</div>
<form action="https://evil.example"><input name="x"></form>
<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">
<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">data link</a>
<details open ontoggle="alert(1)"><summary>s</summary></details>
<object data="x.swf"></object><embed src="x.swf">
<meta http-equiv="refresh" content="0;url=https://evil.example">
<base href="https://evil.example/">
<h2 id="__proto__">proto</h2>
[md link](javascript:alert('md'))
![md image](javascript:alert('img'))

<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>
