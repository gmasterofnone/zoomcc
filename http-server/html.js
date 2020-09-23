import React from 'react'
import { renderToNodeStream } from 'react-dom/server';
import App from '../client/App';

export default res => {
  const appStream = renderToNodeStream(<App />)
  const headHtml =
  `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <link rel="stylesheet" href="main.css">
        <link rel="shortcut icon" href="favicon.ico">
        <title>ZOOM Live CC Concept</title>
      </head>
      <body>
        <div id="root">`

  res.write(headHtml)
  appStream.pipe(res, { end: false })

  const tailHtml =
        `</div>
        <script src="main.js" type="text/javascript"></script>
      </body>
    </html>`

  appStream.on('end', () => {
    res.write(tailHtml)
    res.end()
  })
}