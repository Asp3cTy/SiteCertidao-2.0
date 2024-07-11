document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('certidaoForm');
    const temProtocolo = document.getElementById('temProtocolo');
    const editIndexInput = document.getElementById('editIndex');
    const submitButton = document.getElementById('submitButton');
    const toggleDarkModeButton = document.getElementById('toggleDarkMode');
    const addProtocoloButton = document.getElementById('addProtocoloButton');
    const confirmarCertidaoButton = document.getElementById('confirmarCertidaoButton');
    const filterButton = document.getElementById('applyFilterButton');
    const logoutButton = document.getElementById('logoutButton');
    const userGreeting = document.getElementById('userGreeting');
    let certidoesChart;
    let chart;
    let protocolos = [];
    let currentPage = 1;
    const itemsPerPage = 3;
    let allCertidoes = [];
    let filteredCertidoes = [];

    // Definir a data atual no campo de dataPedido
    const dataPedido = document.getElementById('dataPedido');
    function setTodayDate() {
        if (dataPedido) {
            const today = new Date().toISOString().split('T')[0];
            dataPedido.value = today;
        }
    }
    setTodayDate();

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            fetch('/api/logout', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = '/';
                    } else {
                        alert('Erro ao fazer logout');
                    }
                });
        });
    }

    // Inicializar o gráfico de certidões se ele existir na página
    if (document.getElementById('certidoesChart')) {
        certidoesChart = document.getElementById('certidoesChart').getContext('2d');
        chart = new Chart(certidoesChart, {
            type: 'bar',
            data: {
                labels: ['BALCÃO', 'ARIRJ', 'E-CARTÓRIO'],
                datasets: [{
                    label: 'Quantidade de Certidões',
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(75, 192, 192, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        fetchCertidoes();
    }

    // Carregar modo noturno do armazenamento local
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        toggleDarkMode();
    }

    // Alternar modo noturno
    toggleDarkModeButton.addEventListener('click', toggleDarkMode);

    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        document.querySelector('.navbar').classList.toggle('dark-mode');
        document.querySelectorAll('.form-control').forEach(el => el.classList.toggle('dark-mode'));
        document.querySelector('.table')?.classList.toggle('dark-mode');
        document.querySelector('.modal-content')?.classList.toggle('dark-mode');
        const isDarkModeEnabled = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkModeEnabled);
        toggleDarkModeButton.textContent = isDarkModeEnabled ? 'Modo Claro' : 'Modo Noturno';
    }

    if (temProtocolo) {
        temProtocolo.addEventListener('change', (e) => {
            if (e.target.value === 'sim') {
                $('#protocoloModal').modal('show');
            } else {
                protocolos = [];
            }
        });

        // Garantir que o estado de "Tem Protocolo" não seja alterado ao fechar o modal
        $('#protocoloModal').on('hidden.bs.modal', () => {
            if (protocolos.length > 0) {
                temProtocolo.value = 'sim';
            } else {
                temProtocolo.value = 'não';
            }
        });
    }

    if (addProtocoloButton) {
        addProtocoloButton.addEventListener('click', () => {
            const numeroProtocolo = document.getElementById('numeroProtocolo').value;
            const dadosProtocolo = document.getElementById('dadosProtocolo').value;
            const dataProtocolo = document.getElementById('dataProtocolo').value;

            if (numeroProtocolo && dadosProtocolo && dataProtocolo) {
                protocolos.push({ numeroProtocolo, dadosProtocolo, dataProtocolo });
                document.getElementById('numeroProtocolo').value = '';
                document.getElementById('dadosProtocolo').value = '';
                document.getElementById('dataProtocolo').value = '';
                temProtocolo.value = 'sim';
            }
        });
    }

    if (confirmarCertidaoButton) {
        confirmarCertidaoButton.addEventListener('click', () => {
            const numeroMatricula = document.getElementById('numeroMatricula').value;
            const numeroPedido = document.getElementById('numeroPedido').value;
            const dataPedido = document.getElementById('dataPedido').value;
            const tipoCertidao = document.getElementById('tipoCertidao').value;
            const temProtocoloValue = temProtocolo.value;

            addCertidao(numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocoloValue, protocolos);

            form.reset();
            setTodayDate();  // Atualiza a data para a data atual após resetar o formulário
            protocolos = [];
            editIndexInput.value = '';
            submitButton.textContent = 'Adicionar Certidão';
            alert('Certidão salva com sucesso!');
            $('#protocoloModal').modal('hide'); // Fechar o modal após confirmar a certidão
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const numeroMatricula = document.getElementById('numeroMatricula').value;
            const numeroPedido = document.getElementById('numeroPedido').value;
            const dataPedido = document.getElementById('dataPedido').value;
            const tipoCertidao = document.getElementById('tipoCertidao').value;
            const temProtocoloValue = temProtocolo.value;
            const editIndex = editIndexInput.value;

            if (editIndex) {
                updateCertidao(editIndex, numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocoloValue, protocolos);
            } else {
                addCertidao(numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocoloValue, protocolos);
            }

            form.reset();
            setTodayDate();  // Atualiza a data para a data atual após resetar o formulário
            protocolos = [];
            editIndexInput.value = '';
            submitButton.textContent = 'Adicionar Certidão';
            alert('Certidão salva com sucesso!');
        });
    }

    function addCertidao(numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocolo, protocolos) {
        fetch('/api/certidoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocolo, protocolos })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Certidão adicionada com sucesso!');
            } else {
                alert('Erro ao adicionar certidão');
            }
        });
    }

    function updateCertidao(id, numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocolo, protocolos) {
        fetch(`/api/certidoes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ numeroMatricula, numeroPedido, dataPedido, tipoCertidao, temProtocolo, protocolos })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Certidão atualizada com sucesso!');
            } else {
                alert('Erro ao atualizar certidão');
            }
        });
    }

    function fetchCertidoes() {
        fetch('/api/certidoes')
            .then(response => response.json())
            .then(certidoes => {
                allCertidoes = certidoes;
                filteredCertidoes = certidoes;
                renderCertidoes();
                updateChart();
            });
    }

    function applyFilters() {
        const filterStartDate = document.getElementById('filterStartDate').value;
        const filterEndDate = document.getElementById('filterEndDate').value;

        let url = '/api/certidoes/filter?';
        if (filterStartDate) {
            url += `startDate=${filterStartDate}&`;
        }
        if (filterEndDate) {
            url += `endDate=${filterEndDate}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(certidoes => {
                filteredCertidoes = certidoes;
                currentPage = 1;
                renderCertidoes();
                updateChart();
            });
    }

    function renderCertidoes() {
        const certidoesList = document.getElementById('certidoesList');
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(filteredCertidoes.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedCertidoes = filteredCertidoes.slice(start, end);

        certidoesList.innerHTML = paginatedCertidoes.map(certidao => `
            <tr>
                <td>${certidao.numero_matricula}</td>
                <td>${certidao.numero_pedido}</td>
                <td>${new Date(certidao.data_pedido).toLocaleDateString()}</td>
                <td>${certidao.tipo_certidao}</td>
                <td>${Array.isArray(certidao.protocolos) && certidao.protocolos.length > 0 ? '<button class="btn btn-info btn-sm" onclick="viewProtocolo(' + certidao.id + ')">Ver Protocolos</button>' : 'Não'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteCertidao(${certidao.id})">Excluir</button>
                </td>
            </tr>
        `).join('');

        pagination.innerHTML = `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Anterior</a>
            </li>
            ${Array.from({ length: totalPages }, (_, i) => `
                <li class="page-item ${currentPage === i + 1 ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i + 1})">${i + 1}</a>
                </li>
            `).join('')}
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Próximo</a>
            </li>
        `;
    }

    function updateChart() {
        if (chart) {
            const counts = { 'BALCAO': 0, 'ARIRJ': 0, 'E-CARTORIO': 0 };

            filteredCertidoes.forEach(certidao => {
                if (counts[certidao.tipo_certidao] !== undefined) {
                    counts[certidao.tipo_certidao]++;
                }
            });

            chart.data.datasets[0].data = [counts['BALCAO'], counts['ARIRJ'], counts['E-CARTORIO']];
            chart.update();
        }
    }

    window.changePage = function(page) {
        const totalPages = Math.ceil(filteredCertidoes.length / itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderCertidoes();
        }
    };

    window.viewProtocolo = function(id) {
        fetch(`/api/certidoes/${id}`)
            .then(response => response.json())
            .then(certidao => {
                let protocolos = certidao.protocolos;
                if (typeof protocolos === 'string') {
                    protocolos = JSON.parse(certidao.protocolos || '[]');
                }
                const modalBody = document.getElementById('modalBody');
                modalBody.innerHTML = protocolos.map((protocolo, i) => `
                    <div>
                        <strong>Protocolo ${i + 1}:</strong><br>
                        Número: ${protocolo.numeroProtocolo}, Dados: ${protocolo.dadosProtocolo}, Data: ${new Date(protocolo.dataProtocolo).toLocaleDateString()}
                    </div>
                `).join('');
                $('#protocoloModal').modal('show');
            })
            .catch(error => console.error('Erro ao carregar protocolos:', error));
    };

    window.deleteCertidao = function(id) {
        fetch(`/api/certidoes/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchCertidoes();
                updateChart();
            } else {
                alert('Erro ao excluir certidão');
            }
        });
    };

    if (filterButton) {
        filterButton.addEventListener('click', applyFilters);
    }

    if (document.getElementById('certidoesList')) {
        fetchCertidoes();
    }
});
