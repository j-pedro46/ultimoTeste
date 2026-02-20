const express = require('express')
const app = express()
const methodOverride = require('method-override');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser')

const db = require('./firebase');

app.use(methodOverride('_method'));

app.use(session({
    secret: 'chave_super_segura',
    resave: false,
    saveUninitialized: false
}));

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())

app.use(express.static(path.join(__dirname, 'public')));

function protegerRota(req, res, next) {
  if (req.session && req.session.logado) {
    return next();
  }
  res.redirect('/');
}

app.get('/', (req, res) => {
  req.session.logado = true;
  res.redirect('/home');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/home', protegerRota, (req, res) => {
  res.render('pages/home')
})

app.get('/cadastro', protegerRota, (req, res) => {
  res.render('pages/cadastro')
})

// SALVAR
app.post('/salvar', protegerRota, async (req, res) => {

  const { nome, numero, descricao, data_emissao } = req.body;

  try {

    await db.collection('oficios').add({
      nome,
      numero,
      descricao,
      data_emissao
    });

    res.redirect('/lister');

  } catch (erro) {
    console.error('Erro ao salvar:', erro);
    res.status(500).send('Erro ao salvar');
  }

});

// LISTAR
app.get('/lister', protegerRota, async (req, res) => {

  try {

    const snapshot = await db.collection('oficios')
      .orderBy('numero', 'desc')
      .get();

    const oficios = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.render('pages/lister', { oficios });

  } catch (erro) {
    console.error('Erro ao buscar:', erro);
    res.status(500).send('Erro ao buscar');
  }

});

// DELETAR
app.get('/oficio/:id', protegerRota, async (req, res) => {

  const { id } = req.params;

  try {

    await db.collection('oficios').doc(id).delete();

    res.redirect('/lister');

  } catch (erro) {
    console.error('Erro ao deletar:', erro);
    res.status(500).send('Erro ao deletar');
  }

});

// EDITAR
app.post('/oficio/editar/:id', protegerRota, async (req, res) => {

  const { id } = req.params;
  const { nome, numero, descricao, data_emissao } = req.body;

  try {

    const oficioRef = db.collection('oficios').doc(id);
    const doc = await oficioRef.get();

    if (!doc.exists) {
      return res.send("Ofício não encontrado");
    }

    const atual = doc.data();

    await oficioRef.update({
      nome: nome || atual.nome,
      numero: numero || atual.numero,
      descricao: descricao || atual.descricao,
      data_emissao: data_emissao || atual.data_emissao
    });

    res.redirect('/lister');

  } catch (err) {
    console.error("Erro ao atualizar:", err);
    res.status(500).send("Erro ao atualizar");
  }

});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});