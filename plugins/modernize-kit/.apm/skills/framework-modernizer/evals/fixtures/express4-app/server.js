// Deliberate Express 4 fixture for the framework-modernizer eval suite.
// Comment annotations use the EXPECT-* form to avoid accidental regex hits.

const express = require('express');
const app = express();

// EXPECT-201 SAFE: urlencoded extended default flipped in v5
app.use(express.urlencoded());

// EXPECT-202 SAFE: static dotfiles default flipped in v5
app.use(express.static('public'));

// EXPECT-001 AUTOFIX: app.del removed
app.del('/user/:id', (req, res) => {
  res.send(`DELETE /user/${req.params.id}`);
});

// EXPECT-006 AUTOFIX: magic redirect string removed
app.get('/back', (req, res) => {
  res.redirect('back');
});

// EXPECT-007 AUTOFIX: lowercase method renamed
app.get('/file', (req, res) => {
  res.sendfile(__dirname + '/public/index.html');
});

// EXPECT-002 AUTOFIX: numeric-only send removed
app.get('/notfound', (req, res) => {
  res.send(404);
});

// EXPECT-101 MANUAL: unnamed wildcard
app.get('/*', (req, res) => {
  res.send('catch-all');
});

// EXPECT-102 MANUAL: optional segment
app.get('/file/:name.:ext?', (req, res) => {
  res.send(`name=${req.params.name} ext=${req.params.ext}`);
});

module.exports = app;
