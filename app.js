const express = require('express');
const app = express();
const connection = require('./db');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configurar sessões
app.use(session({
    secret: 'secreto', // Altere para um segredo seguro em produção
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Defina como true se estiver usando HTTPS
}));

// Middleware para verificar se o usuário está logado
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
}

// Registro de Usuário
app.post('/api/register', (req, res) => {
    const { nome, username, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    const query = 'INSERT INTO usuarios (nome, username, email, password) VALUES (?, ?, ?, ?)';
    connection.query(query, [nome, username, email, hashedPassword], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: 'Usuário ou email já existente!' });
            }
            throw err;
        }
        res.json({ success: true });
    });
});

// Login de Usuário
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM usuarios WHERE username = ?';
    connection.query(query, [username], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            return res.json({ success: false, message: 'Usuário não encontrado!' });
        }

        const user = results[0];
        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) {
            return res.json({ success: false, message: 'Senha incorreta!' });
        }

        // Armazenar informações do usuário na sessão
        req.session.user = {
            id: user.id,
            nome: user.nome,
            username: user.username,
            email: user.email
        };

        res.json({ success: true, user: req.session.user });
    });
});

// Logout de Usuário
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Atualizar dados do usuário
app.put('/api/user', isAuthenticated, (req, res) => {
    const { nome, username, email, password } = req.body;
    const userId = req.session.user.id;
    let query, params;

    if (password) {
        const hashedPassword = bcrypt.hashSync(password, 8);
        query = 'UPDATE usuarios SET nome = ?, username = ?, email = ?, password = ? WHERE id = ?';
        params = [nome, username, email, hashedPassword, userId];
    } else {
        query = 'UPDATE usuarios SET nome = ?, username = ?, email = ? WHERE id = ?';
        params = [nome, username, email, userId];
    }

    connection.query(query, params, (err, results) => {
        if (err) throw err;
        req.session.user = { id: userId, nome, username, email };
        res.json({ success: true, user: req.session.user });
    });
});

// Obter dados do usuário logado
app.get('/api/user', isAuthenticated, (req, res) => {
    res.json({ success: true, user: req.session.user });
});

// Rotas para Certidões

// Obter todas as certidões
app.get('/api/certidoes', isAuthenticated, (req, res) => {
    const query = 'SELECT * FROM certidoes WHERE user_id = ? ORDER BY data_pedido DESC';
    connection.query(query, [req.session.user.id], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Filtrar certidões por data
app.get('/api/certidoes/filter', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const { startDate, endDate } = req.query;

    let query = 'SELECT * FROM certidoes WHERE user_id = ?';
    let queryParams = [userId];

    if (startDate && endDate) {
        query += ' AND data_pedido BETWEEN ? AND ?';
        queryParams.push(startDate, endDate);
    } else if (startDate) {
        query += ' AND data_pedido >= ?';
        queryParams.push(startDate);
    } else if (endDate) {
        query += ' AND data_pedido <= ?';
        queryParams.push(endDate);
    }

    query += ' ORDER BY data_pedido DESC';

    connection.query(query, queryParams, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Adicionar uma nova certidão
app.post('/api/certidoes', isAuthenticated, (req, res) => {
    const { numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocolo, protocolos } = req.body;
    const userId = req.session.user.id;
    const query = 'INSERT INTO certidoes (user_id, numero_matricula, numero_pedido, data_pedido, tipo_certidao, tem_protocolo, protocolos) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const params = [userId, numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocolo === 'sim' ? 'sim' : 'não', JSON.stringify(protocolos)];

    connection.query(query, params, (err, results) => {
        if (err) throw err;
        res.json({ success: true });
    });
});

// Atualizar uma certidão existente
app.put('/api/certidoes/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocolo, protocolos } = req.body;
    const userId = req.session.user.id;

    const query = 'UPDATE certidoes SET numero_matricula = ?, numero_pedido = ?, data_pedido = ?, tipo_certidao = ?, tem_protocolo = ?, protocolos = ? WHERE id = ? AND user_id = ?';
    const params = [numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocolo === 'sim' ? 'sim' : 'não', JSON.stringify(protocolos), id, userId];

    connection.query(query, params, (err, results) => {
        if (err) throw err;
        res.json({ success: true });
    });
});

// Deletar uma certidão
app.delete('/api/certidoes/:id', isAuthenticated, (req, res) => {
    const certidaoId = req.params.id;
    const userId = req.session.user.id;
    const query = 'DELETE FROM certidoes WHERE id = ? AND user_id = ?';
    connection.query(query, [certidaoId, userId], (err, results) => {
        if (err) throw err;
        res.json({ success: true });
    });
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
