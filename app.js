// configurações bases 
const express = require('express')
const app = express()
const methodOverride = require('method-override');
const path = require('path'); //  NECESSÁRIO para configurar o caminho das views
app.use(methodOverride('_method'));

const pool = require('./database'); // banco de dados

const session = require('express-session');

app.use(session({
    secret: 'chave_super_segura',
    resave: false,
    saveUninitialized: false
}));

// Testar conexão
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('✅ Conexão com o banco de dados bem-sucedida!');
    console.log('🕒 Hora atual do PostgreSQL:', result.rows[0].now);
  }
});

const port = 3000
const bodyParser = require('body-parser')

//  CONFIGURAÇÃO DA VIEW ENGINE
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

// TRATAMENTO DE FORMULÁRIOS
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())

// LIBERAR ARQUIVOS ESTÁTICOS (IMAGENS, CSS, JS) 
app.use(express.static(path.join(__dirname, 'public')));

// proteção de rota
function protegerRota(req, res, next) {
  if (req.session && req.session.logado) {
    return next();
  }
  res.redirect('/');
}

// LOGIN (tela)
app.get('/', (req, res) => {
  res.render('pages/form')
});

// LOGIN (verificação)
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM login WHERE email = $1 AND senha = $2',
      [email, senha]
    );

    if (result.rows.length > 0) {
      req.session.logado = true;
      return res.redirect('/home');
    }

    console.log("Usuário ou senha inválidos");

  } catch (erro) {
    console.error("Erro ao fazer login:", erro);
    res.status(500).send('Erro ao fazer login');
  }
});

// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// rotas protegidas

// form
app.get('/form', protegerRota, (req, res) => {
  res.render('pages/form')
})

// home
app.get('/home', protegerRota, (req, res) => {
  res.render('pages/home')
})

// cadastro
app.get('/cadastro', protegerRota, (req, res) => {
  res.render('pages/cadastro')
})

// SALVAR OFÍCIO
app.post('/salvar', protegerRota, async (req, res) => {
  const { nome, numero, data_emissao } = req.body;

  try {
    await pool.query(
      'INSERT INTO oficio ( nome, numero, data_emissao) VALUES ($1,$2,$3)',
      [ nome, numero, data_emissao]
    );

    res.redirect('/lister')
  }
  catch (erro) {
    console.error('Erro ao salvar oficio:', erro);
    res.status(500).send('Erro ao salvar oficio');
  }
});

// LISTAR OFÍCIOS
app.get('/lister', protegerRota, async (req, res) => {

  try {
    const result = await pool.query('SELECT * FROM oficio ORDER BY CAST (numero AS INTEGER) DESC');
    res.render('pages/lister', { oficios: result.rows });
  }
  catch (erro) {
    console.error('Erro ao buscar oficios:', erro);
    res.status(500).send('Erro ao buscar oficios');
  }
});

// DELETAR OFÍCIO
app.get('/oficio/:id', protegerRota, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM oficio WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).send('Oficio não encontrado');
    }

    res.redirect('/lister');
  } 
  catch (erro) {
    console.error('Erro ao deletar oficio:', erro);
    res.status(500).send('Erro interno do servidor');
  }
});

// rota de atualizar 
app.post('/oficio/editar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, numero, data_emissao } = req.body;

        // Buscar dados atuais
        const atual = await pool.query(
            'SELECT * FROM oficio WHERE id = $1',
            [id]
        );

        if (atual.rowCount === 0) {
            return res.status(404).send("Ofício não encontrado");
        }

        const oficioAtual = atual.rows[0];

        // Se o campo NÃO veio preenchido, manter o valor antigo
        const novoNome = nome && nome.trim() !== '' ? nome : oficioAtual.nome;
        const novoNumero = numero && numero.trim() !== '' ? numero : oficioAtual.numero;
        const novaData = data_emissao && data_emissao !== '' ? data_emissao : oficioAtual.data_emissao;

        // UPDATE final
        await pool.query(
            'UPDATE oficio SET nome = $1, numero = $2, data_emissao = $3 WHERE id = $4',
            [novoNome, novoNumero, novaData, id]
        );

        res.redirect('/lister');

    } catch (err) {
        console.error("Erro ao atualizar:", err);
        res.status(500).send("Erro ao atualizar");
    }
});

// rota de carregar dados para edição
app.get('/oficio/editar/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM oficio WHERE id = $1',
            [id]
        );

        const oficio = result.rows[0];

        res.render('editar', { oficio }); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar edição");
    }
});

// servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`)
});
