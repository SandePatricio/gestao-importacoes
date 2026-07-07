-- Migração: processo de importação (Pedido), anexos e generalização da factura.
-- Aplica-se a bases de dados que já existiam antes desta funcionalidade.
-- Em bases novas, o create_all do arranque cria as tabelas; estes ALTER tratam
-- apenas das colunas acrescentadas a tabelas existentes.

-- 1) Tabelas novas (create_all já as cria; aqui ficam para referência/SGBD manual)
CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  estado VARCHAR(30) NOT NULL,
  origem VARCHAR(20) NOT NULL DEFAULT 'OPERADOR',
  criado_por_id INT NULL,
  preco_produto_mzn DECIMAL(12,2) NULL,
  servico_compra_mzn DECIMAL(12,2) NULL,
  peso_estimado_kg DECIMAL(10,2) NULL,
  estimativa_transporte_mzn DECIMAL(12,2) NULL,
  cotacao_observacoes TEXT NULL,
  cotacao_enviada_em DATETIME NULL,
  aprovada_em DATETIME NULL,
  tracking_externo VARCHAR(100) NULL,
  transportadora VARCHAR(80) NULL,
  previsao_chegada_china DATE NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  CONSTRAINT fk_pedido_criador FOREIGN KEY (criado_por_id) REFERENCES utilizadores(id)
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  descricao TEXT NOT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  variacao VARCHAR(255) NULL,
  link_produto VARCHAR(500) NULL,
  observacoes TEXT NULL,
  CONSTRAINT fk_item_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);

CREATE TABLE IF NOT EXISTS anexos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NULL,
  encomenda_id INT NULL,
  factura_id INT NULL,
  categoria VARCHAR(30) NOT NULL DEFAULT 'OUTRO',
  nome_original VARCHAR(255) NOT NULL,
  caminho VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NULL,
  tamanho_bytes INT NULL,
  utilizador_id INT NULL,
  cliente_id INT NULL,
  visivel_cliente TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_anexo_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  CONSTRAINT fk_anexo_encomenda FOREIGN KEY (encomenda_id) REFERENCES encomendas(id),
  CONSTRAINT fk_anexo_factura FOREIGN KEY (factura_id) REFERENCES facturas(id)
);

-- 2) Colunas acrescentadas a tabelas existentes
ALTER TABLE encomendas
  ADD COLUMN data_disponivel DATETIME NULL,
  ADD COLUMN pedido_id INT NULL,
  ADD CONSTRAINT fk_encomenda_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id);

ALTER TABLE facturas
  ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'TRANSPORTE',
  ADD COLUMN pedido_id INT NULL,
  MODIFY COLUMN encomenda_id INT NULL,
  ADD CONSTRAINT fk_factura_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id);

ALTER TABLE notificacoes
  ADD COLUMN pedido_id INT NULL,
  MODIFY COLUMN encomenda_id INT NULL,
  ADD CONSTRAINT fk_notificacao_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id);
