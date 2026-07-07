-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: gestao_importacoes
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `gestao_importacoes`
--

/*!40000 DROP DATABASE IF EXISTS `gestao_importacoes`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `gestao_importacoes` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `gestao_importacoes`;

--
-- Table structure for table `anexos`
--

DROP TABLE IF EXISTS `anexos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `anexos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pedido_id` int(11) DEFAULT NULL,
  `encomenda_id` int(11) DEFAULT NULL,
  `factura_id` int(11) DEFAULT NULL,
  `categoria` enum('FOTO_PRODUTO','FOTO_ARMAZEM','FACTURA_FORNECEDOR','COMPROVATIVO_PAGAMENTO','DOC_ALFANDEGA','OUTRO') NOT NULL,
  `nome_original` varchar(255) NOT NULL,
  `caminho` varchar(500) NOT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `tamanho_bytes` int(11) DEFAULT NULL,
  `utilizador_id` int(11) DEFAULT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `visivel_cliente` tinyint(1) NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `utilizador_id` (`utilizador_id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `ix_anexos_factura_id` (`factura_id`),
  KEY `ix_anexos_encomenda_id` (`encomenda_id`),
  KEY `ix_anexos_pedido_id` (`pedido_id`),
  CONSTRAINT `anexos_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`),
  CONSTRAINT `anexos_ibfk_2` FOREIGN KEY (`encomenda_id`) REFERENCES `encomendas` (`id`),
  CONSTRAINT `anexos_ibfk_3` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`),
  CONSTRAINT `anexos_ibfk_4` FOREIGN KEY (`utilizador_id`) REFERENCES `utilizadores` (`id`),
  CONSTRAINT `anexos_ibfk_5` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `anexos`
--

LOCK TABLES `anexos` WRITE;
/*!40000 ALTER TABLE `anexos` DISABLE KEYS */;
INSERT INTO `anexos` VALUES (1,1,NULL,NULL,'FACTURA_FORNECEDOR','Screenshot 2026-06-16 at 10.30.57.png','2026/06/b1b0bed352664949bb905ab16c47a272.png','image/png',609861,1,NULL,1,'2026-06-18 19:21:30'),(2,1,NULL,NULL,'COMPROVATIVO_PAGAMENTO','ATA DE REUNIÃO.pdf','2026/06/45203294d27f44d6bbfbabb7d0387e26.pdf','application/pdf',41221,NULL,1,1,'2026-06-18 19:22:18'),(3,NULL,NULL,12,'COMPROVATIVO_PAGAMENTO','Screenshot 2026-06-02 at 19.33.12.png','2026/06/0d9b92f9871a4e10a187ba00ed74638f.png','image/png',1001004,NULL,3,1,'2026-06-18 20:00:23'),(4,NULL,NULL,13,'COMPROVATIVO_PAGAMENTO','Reunião MC-NET - 17:06:26.pdf','2026/06/9bd643c2cf89411d923c11f29d3ce40e.pdf','application/pdf',30324,NULL,4,1,'2026-06-18 20:37:38'),(5,NULL,NULL,14,'COMPROVATIVO_PAGAMENTO','Screenshot 2026-06-02 at 19.33.12.png','2026/06/bf4d5c52f9b14758963fd8f02f3c7ab0.png','image/png',1001004,NULL,4,1,'2026-06-18 20:40:18');
/*!40000 ALTER TABLE `anexos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(120) NOT NULL,
  `telefone` varchar(20) NOT NULL,
  `email` varchar(120) DEFAULT NULL,
  `nuit` varchar(20) DEFAULT NULL,
  `endereco` varchar(255) DEFAULT NULL,
  `senha_hash` varchar(255) DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_clientes_telefone` (`telefone`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,'Maria Cossa','+258841112233',NULL,NULL,NULL,'$2b$12$PJy.7gzpb3QuTz0WeVi0/.QNLxSfF.YIOwN1.UU3OC276bf0hb6Xq','2026-06-12 17:38:08'),(3,'onnys Anild','+258847422831','onnysanild@gmail.com',NULL,NULL,'$2b$12$Cll6exZ6TkmUsfhX0YAS0.t5YhjS9l5mRNgllKf5yPXs2jGl1rcxm','2026-06-18 19:36:57'),(4,'Sande Patricio','829805373','sandre.patricio@gmail.com',NULL,NULL,'$2b$12$sY33LTUXwag21kPJJALrEOMDPtqzir1JYnhdF/.tDb7y.m.RmD.wC','2026-06-18 20:32:38');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracao_frete`
--

DROP TABLE IF EXISTS `configuracao_frete`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `configuracao_frete` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tarifa_por_kg` decimal(12,2) NOT NULL,
  `divisor_volumetrico` int(11) NOT NULL,
  `ispc_metodo` varchar(20) NOT NULL DEFAULT 'PROGRESSIVA',
  `ispc_percentagem` decimal(5,2) NOT NULL DEFAULT 3.00,
  `ispc_quota_anual` decimal(12,2) NOT NULL DEFAULT 75000.00,
  `ispc_primeiro_ano` tinyint(1) NOT NULL DEFAULT 0,
  `empresa_nome` varchar(160) NOT NULL DEFAULT 'Connex Importações, Lda.',
  `empresa_nuit` varchar(20) NOT NULL DEFAULT '',
  `empresa_endereco` varchar(255) NOT NULL DEFAULT 'Maputo, Moçambique',
  `empresa_telefone` varchar(40) NOT NULL DEFAULT '',
  `daf` varchar(120) NOT NULL DEFAULT '',
  `declarante_nome` varchar(120) NOT NULL DEFAULT '',
  `declarante_cargo` varchar(120) NOT NULL DEFAULT '',
  `actualizado_em` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracao_frete`
--

LOCK TABLES `configuracao_frete` WRITE;
/*!40000 ALTER TABLE `configuracao_frete` DISABLE KEYS */;
INSERT INTO `configuracao_frete` VALUES (1,1800.00,6000,'PROGRESSIVA',3.00,75000.00,0,'Connex Importações, Lda.','123456789','Maputo, Moçambique','','','','','2026-06-15 19:26:09');
/*!40000 ALTER TABLE `configuracao_frete` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `encomendas`
--

DROP TABLE IF EXISTS `encomendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `encomendas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_rastreio` varchar(20) NOT NULL,
  `awb` varchar(50) DEFAULT NULL,
  `tracking_externo` varchar(100) DEFAULT NULL,
  `transportadora` varchar(80) DEFAULT NULL,
  `descricao` text NOT NULL,
  `peso_kg` decimal(10,2) DEFAULT NULL,
  `comprimento_cm` decimal(10,2) DEFAULT NULL,
  `largura_cm` decimal(10,2) DEFAULT NULL,
  `altura_cm` decimal(10,2) DEFAULT NULL,
  `valor_frete` decimal(12,2) DEFAULT NULL,
  `origem` varchar(80) NOT NULL,
  `destino` varchar(80) NOT NULL,
  `estado` enum('REGISTADA','RECEBIDA_CHINA','EMBARCADA','EM_TRANSITO','CHEGOU_MOCAMBIQUE','DESALFANDEGADA','DISPONIVEL_LEVANTAMENTO','ENTREGUE','ATRASADA') NOT NULL,
  `previsao_chegada` date DEFAULT NULL,
  `data_registo` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_em` datetime NOT NULL DEFAULT current_timestamp(),
  `cliente_id` int(11) NOT NULL,
  `data_disponivel` datetime DEFAULT NULL,
  `pedido_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_encomendas_codigo_rastreio` (`codigo_rastreio`),
  KEY `cliente_id` (`cliente_id`),
  KEY `ix_encomendas_awb` (`awb`),
  KEY `ix_encomendas_tracking_externo` (`tracking_externo`),
  KEY `ix_encomendas_estado` (`estado`),
  KEY `fk_encomenda_pedido` (`pedido_id`),
  CONSTRAINT `encomendas_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `fk_encomenda_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `encomendas`
--

LOCK TABLES `encomendas` WRITE;
/*!40000 ALTER TABLE `encomendas` DISABLE KEYS */;
INSERT INTO `encomendas` VALUES (1,'CNX-841FCD',NULL,NULL,NULL,'Roupa (caixa 20kg)',NULL,NULL,NULL,NULL,NULL,'China','Maputo, Moçambique','DESALFANDEGADA',NULL,'2026-06-12 17:38:08','2026-06-12 18:07:19',1,NULL,NULL),(2,'CNX-2CB293',NULL,NULL,NULL,'Electrónicos',NULL,NULL,NULL,NULL,NULL,'China','Maputo, Moçambique','REGISTADA',NULL,'2026-06-12 17:38:08','2026-06-12 17:38:08',1,NULL,NULL),(3,'CNX-FC28AB',NULL,'123124124141','DHL','Zona',10.00,12.00,23.00,21.00,18000.00,'China','Maputo, Moçambique','REGISTADA','2026-06-26','2026-06-13 13:38:19','2026-06-13 13:38:19',1,NULL,NULL),(5,'CNX-A98B57',NULL,'1341413244512','20','ABC',20.00,12.00,23.00,12.00,36000.00,'China','Maputo, Moçambique','EM_TRANSITO','2026-06-13','2026-06-13 13:47:07','2026-06-15 19:10:57',1,NULL,NULL),(7,'CNX-0C6812','hhhbu87989',NULL,'hhh','1× ooooo',90.00,8.00,8.00,8.00,162000.00,'China','Maputo, Moçambique','ENTREGUE',NULL,'2026-06-18 19:26:59','2026-06-18 19:30:43',1,NULL,1),(8,'CNX-C371AC','ewfew12412',NULL,'13','4× Sofas L',10.00,12.00,12.00,13.00,18000.00,'China','Maputo, Moçambique','ENTREGUE',NULL,'2026-06-18 20:38:58','2026-06-18 20:39:36',4,NULL,3);
/*!40000 ALTER TABLE `encomendas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos_tracking`
--

DROP TABLE IF EXISTS `eventos_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `eventos_tracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `encomenda_id` int(11) NOT NULL,
  `estado` enum('REGISTADA','RECEBIDA_CHINA','EMBARCADA','EM_TRANSITO','CHEGOU_MOCAMBIQUE','DESALFANDEGADA','DISPONIVEL_LEVANTAMENTO','ENTREGUE','ATRASADA') NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `localizacao` varchar(120) DEFAULT NULL,
  `origem_evento` enum('MANUAL','API_TRACKING') NOT NULL,
  `data_evento` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_eventos_tracking_encomenda_id` (`encomenda_id`),
  CONSTRAINT `eventos_tracking_ibfk_1` FOREIGN KEY (`encomenda_id`) REFERENCES `encomendas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos_tracking`
--

LOCK TABLES `eventos_tracking` WRITE;
/*!40000 ALTER TABLE `eventos_tracking` DISABLE KEYS */;
INSERT INTO `eventos_tracking` VALUES (1,1,'REGISTADA','Encomenda registada no sistema.',NULL,'MANUAL','2026-06-12 17:38:08'),(2,2,'REGISTADA','Encomenda registada no sistema.',NULL,'MANUAL','2026-06-12 17:38:08'),(3,1,'RECEBIDA_CHINA','A sua encomenda foi recebida no nosso armazém na China.',NULL,'MANUAL','2026-06-12 18:06:46'),(4,1,'EMBARCADA','A sua encomenda foi embarcada no voo para Moçambique.',NULL,'MANUAL','2026-06-12 18:06:54'),(5,1,'EM_TRANSITO','A sua encomenda está em trânsito.',NULL,'MANUAL','2026-06-12 18:07:05'),(6,1,'CHEGOU_MOCAMBIQUE','A sua encomenda chegou a Moçambique.',NULL,'MANUAL','2026-06-12 18:07:15'),(7,1,'DESALFANDEGADA','A sua encomenda foi desalfandegada.',NULL,'MANUAL','2026-06-12 18:07:19'),(8,3,'REGISTADA','Encomenda registada no sistema.',NULL,'MANUAL','2026-06-13 13:38:19'),(10,5,'REGISTADA','Encomenda registada no sistema.',NULL,'MANUAL','2026-06-13 13:47:07'),(12,5,'RECEBIDA_CHINA','A sua encomenda foi recebida no nosso armazém na China.',NULL,'MANUAL','2026-06-15 19:10:33'),(13,5,'EMBARCADA','A sua encomenda foi embarcada no voo para Moçambique.',NULL,'MANUAL','2026-06-15 19:10:45'),(14,5,'EM_TRANSITO','A sua encomenda está em trânsito.',NULL,'MANUAL','2026-06-15 19:10:57'),(15,7,'RECEBIDA_CHINA','Mercadoria recebida e medida no armazém da China.',NULL,'MANUAL','2026-06-18 19:26:59'),(16,7,'ENTREGUE','A sua encomenda foi entregue. Obrigado pela preferência!',NULL,'MANUAL','2026-06-18 19:30:43'),(17,8,'RECEBIDA_CHINA','Mercadoria recebida e medida no armazém da China.',NULL,'MANUAL','2026-06-18 20:38:58'),(18,8,'ENTREGUE','A sua encomenda foi entregue. Obrigado pela preferência!',NULL,'MANUAL','2026-06-18 20:39:36');
/*!40000 ALTER TABLE `eventos_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `facturas`
--

DROP TABLE IF EXISTS `facturas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `facturas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(30) NOT NULL,
  `encomenda_id` int(11) DEFAULT NULL,
  `valor_total` decimal(12,2) NOT NULL,
  `peso_cobravel_kg` decimal(10,2) DEFAULT NULL,
  `tarifa_aplicada` decimal(12,2) DEFAULT NULL,
  `estado` enum('PENDENTE','PAGA','CANCELADA') NOT NULL,
  `data_emissao` datetime NOT NULL DEFAULT current_timestamp(),
  `tipo` varchar(20) NOT NULL DEFAULT 'TRANSPORTE',
  `pedido_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_facturas_numero` (`numero`),
  KEY `ix_facturas_encomenda_id` (`encomenda_id`),
  KEY `fk_factura_pedido` (`pedido_id`),
  CONSTRAINT `facturas_ibfk_1` FOREIGN KEY (`encomenda_id`) REFERENCES `encomendas` (`id`),
  CONSTRAINT `fk_factura_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `facturas`
--

LOCK TABLES `facturas` WRITE;
/*!40000 ALTER TABLE `facturas` DISABLE KEYS */;
INSERT INTO `facturas` VALUES (1,'FT2026/00001',1,7500.00,NULL,NULL,'PAGA','2026-06-12 17:38:08','TRANSPORTE',NULL),(2,'FT2026/00002',2,60000.00,NULL,NULL,'PAGA','2026-06-12 18:19:03','TRANSPORTE',NULL),(5,'FT2026/00003',5,36000.00,20.00,NULL,'PAGA','2026-06-13 13:49:36','TRANSPORTE',NULL),(6,'FT2026/00004',3,18000.00,10.00,NULL,'PAGA','2026-06-13 13:50:38','TRANSPORTE',NULL),(8,'FT2026/00005',NULL,2020.00,NULL,NULL,'PAGA','2026-06-18 19:22:02','PRODUTO',1),(9,'FT2026/00006',7,162000.00,90.00,1800.00,'PAGA','2026-06-18 19:30:50','TRANSPORTE',NULL),(10,'FT2026/00007',7,162000.00,90.00,1800.00,'PAGA','2026-06-18 19:30:55','TRANSPORTE',NULL),(11,'FT2026/00008',7,162000.00,90.00,1800.00,'PAGA','2026-06-18 19:30:59','TRANSPORTE',NULL),(12,'FT2026/00009',NULL,101.00,NULL,NULL,'PAGA','2026-06-18 19:46:58','PRODUTO',2),(13,'FT2026/00010',NULL,200.00,NULL,NULL,'PAGA','2026-06-18 20:37:14','PRODUTO',3),(14,'FT2026/00011',8,18000.00,10.00,1800.00,'PAGA','2026-06-18 20:40:05','TRANSPORTE',NULL);
/*!40000 ALTER TABLE `facturas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `itens_pedido`
--

DROP TABLE IF EXISTS `itens_pedido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `itens_pedido` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pedido_id` int(11) NOT NULL,
  `descricao` text NOT NULL,
  `quantidade` int(11) NOT NULL,
  `variacao` varchar(255) DEFAULT NULL,
  `link_produto` varchar(500) DEFAULT NULL,
  `observacoes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_itens_pedido_pedido_id` (`pedido_id`),
  CONSTRAINT `itens_pedido_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `itens_pedido`
--

LOCK TABLES `itens_pedido` WRITE;
/*!40000 ALTER TABLE `itens_pedido` DISABLE KEYS */;
INSERT INTO `itens_pedido` VALUES (1,1,'ooooo',1,'jkjk',NULL,NULL),(2,2,'ssss',1,'sdfds',NULL,NULL),(3,3,'Sofas L',4,'Azul',NULL,NULL);
/*!40000 ALTER TABLE `itens_pedido` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logs_configuracao_frete`
--

DROP TABLE IF EXISTS `logs_configuracao_frete`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `logs_configuracao_frete` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utilizador_id` int(11) DEFAULT NULL,
  `utilizador_nome` varchar(120) NOT NULL,
  `alteracoes` text NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `utilizador_id` (`utilizador_id`),
  CONSTRAINT `logs_configuracao_frete_ibfk_1` FOREIGN KEY (`utilizador_id`) REFERENCES `utilizadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logs_configuracao_frete`
--

LOCK TABLES `logs_configuracao_frete` WRITE;
/*!40000 ALTER TABLE `logs_configuracao_frete` DISABLE KEYS */;
INSERT INTO `logs_configuracao_frete` VALUES (1,1,'Administrador','NUIT: — → 123456789','2026-06-15 19:26:09');
/*!40000 ALTER TABLE `logs_configuracao_frete` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificacoes`
--

DROP TABLE IF EXISTS `notificacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notificacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `encomenda_id` int(11) DEFAULT NULL,
  `canal` enum('EMAIL','WHATSAPP','SMS') NOT NULL,
  `mensagem` text NOT NULL,
  `estado` enum('PENDENTE','ENVIADA','FALHADA') NOT NULL,
  `enviada_em` datetime DEFAULT NULL,
  `criada_em` datetime NOT NULL DEFAULT current_timestamp(),
  `pedido_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_notificacoes_encomenda_id` (`encomenda_id`),
  KEY `fk_notificacao_pedido` (`pedido_id`),
  CONSTRAINT `fk_notificacao_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`),
  CONSTRAINT `notificacoes_ibfk_1` FOREIGN KEY (`encomenda_id`) REFERENCES `encomendas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificacoes`
--

LOCK TABLES `notificacoes` WRITE;
/*!40000 ALTER TABLE `notificacoes` DISABLE KEYS */;
INSERT INTO `notificacoes` VALUES (1,1,'EMAIL','[CNX-841FCD] A sua encomenda foi recebida no nosso armazém na China.','FALHADA',NULL,'2026-06-12 18:06:46',NULL),(2,1,'EMAIL','[CNX-841FCD] A sua encomenda foi embarcada no voo para Moçambique.','FALHADA',NULL,'2026-06-12 18:06:54',NULL),(3,1,'EMAIL','[CNX-841FCD] A sua encomenda está em trânsito.','FALHADA',NULL,'2026-06-12 18:07:05',NULL),(4,1,'EMAIL','[CNX-841FCD] A sua encomenda chegou a Moçambique.','FALHADA',NULL,'2026-06-12 18:07:15',NULL),(5,1,'EMAIL','[CNX-841FCD] A sua encomenda foi desalfandegada.','FALHADA',NULL,'2026-06-12 18:07:19',NULL),(6,5,'EMAIL','[CNX-A98B57] A sua encomenda foi recebida no nosso armazém na China.','FALHADA',NULL,'2026-06-15 19:10:33',NULL),(7,5,'EMAIL','[CNX-A98B57] A sua encomenda foi embarcada no voo para Moçambique.','FALHADA',NULL,'2026-06-15 19:10:45',NULL),(8,5,'EMAIL','[CNX-A98B57] A sua encomenda está em trânsito.','FALHADA',NULL,'2026-06-15 19:10:57',NULL),(9,NULL,'EMAIL','[PED-EEA317] Recebemos a sua solicitação de importação.','FALHADA',NULL,'2026-06-18 19:19:30',1),(10,NULL,'EMAIL','[PED-EEA317] A sua cotação está disponível. Aguardamos a aprovação.','FALHADA',NULL,'2026-06-18 19:20:46',1),(11,NULL,'EMAIL','[PED-EEA317] Cotação aprovada. Vamos avançar com a compra.','FALHADA',NULL,'2026-06-18 19:20:52',1),(12,NULL,'EMAIL','[PED-EEA317] Pagamento do produto confirmado.','FALHADA',NULL,'2026-06-18 19:26:00',1),(13,NULL,'EMAIL','[PED-EEA317] O produto foi comprado ao fornecedor.','FALHADA',NULL,'2026-06-18 19:26:36',1),(14,NULL,'EMAIL','[PED-EEA317] Mercadoria recebida e medida no armazém da China.','FALHADA',NULL,'2026-06-18 19:26:59',1),(15,7,'EMAIL','[CNX-0C6812] A sua encomenda foi entregue. Obrigado pela preferência!','FALHADA',NULL,'2026-06-18 19:30:43',NULL),(16,NULL,'EMAIL','[PED-8FD4F0] Recebemos a sua solicitação de importação.','FALHADA',NULL,'2026-06-18 19:37:30',2),(17,NULL,'EMAIL','[PED-8FD4F0] A sua cotação está disponível. Aguardamos a aprovação.','FALHADA',NULL,'2026-06-18 19:46:20',2),(18,NULL,'EMAIL','[PED-8FD4F0] Cotação aprovada. Vamos avançar com a compra.','FALHADA',NULL,'2026-06-18 19:46:45',2),(19,NULL,'EMAIL','[PED-8FD4F0] Pagamento do produto confirmado.','FALHADA',NULL,'2026-06-18 20:00:36',2),(20,NULL,'EMAIL','[PED-ABF75C] Recebemos a sua solicitação de importação.','FALHADA',NULL,'2026-06-18 20:33:14',3),(21,NULL,'EMAIL','[PED-ABF75C] A sua cotação está disponível. Aguardamos a aprovação.','FALHADA',NULL,'2026-06-18 20:36:12',3),(22,NULL,'EMAIL','[PED-ABF75C] Cotação aprovada. Vamos avançar com a compra.','FALHADA',NULL,'2026-06-18 20:37:00',3),(23,NULL,'EMAIL','[PED-ABF75C] Pagamento do produto confirmado.','FALHADA',NULL,'2026-06-18 20:37:57',3),(24,NULL,'EMAIL','[PED-ABF75C] O produto foi comprado ao fornecedor.','FALHADA',NULL,'2026-06-18 20:38:13',3),(25,NULL,'EMAIL','[PED-ABF75C] Mercadoria recebida e medida no armazém da China.','FALHADA',NULL,'2026-06-18 20:38:58',3),(26,8,'EMAIL','[CNX-C371AC] A sua encomenda foi entregue. Obrigado pela preferência!','FALHADA',NULL,'2026-06-18 20:39:36',NULL);
/*!40000 ALTER TABLE `notificacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pedidos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `tipo` enum('COM_COMPRA','ENVIO_DIRECTO') NOT NULL,
  `estado` enum('SOLICITACAO_RECEBIDA','COTACAO_ENVIADA','APROVADA','PRODUTO_PAGO','PRODUTO_COMPRADO','AGUARDA_ARMAZEM_CHINA','RECEBIDO_MEDIDO','EM_EXECUCAO','CONCLUIDO','CANCELADO') NOT NULL,
  `origem` varchar(20) NOT NULL,
  `criado_por_id` int(11) DEFAULT NULL,
  `preco_produto_mzn` decimal(12,2) DEFAULT NULL,
  `servico_compra_mzn` decimal(12,2) DEFAULT NULL,
  `peso_estimado_kg` decimal(10,2) DEFAULT NULL,
  `estimativa_transporte_mzn` decimal(12,2) DEFAULT NULL,
  `cotacao_observacoes` text DEFAULT NULL,
  `cotacao_enviada_em` datetime DEFAULT NULL,
  `aprovada_em` datetime DEFAULT NULL,
  `tracking_externo` varchar(100) DEFAULT NULL,
  `transportadora` varchar(80) DEFAULT NULL,
  `previsao_chegada_china` date DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_em` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_pedidos_codigo` (`codigo`),
  KEY `criado_por_id` (`criado_por_id`),
  KEY `ix_pedidos_estado` (`estado`),
  KEY `ix_pedidos_cliente_id` (`cliente_id`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `pedidos_ibfk_2` FOREIGN KEY (`criado_por_id`) REFERENCES `utilizadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
INSERT INTO `pedidos` VALUES (1,'PED-EEA317',1,'COM_COMPRA','CONCLUIDO','OPERADOR',1,2000.00,20.00,2.00,24.00,NULL,'2026-06-18 19:20:46','2026-06-18 19:20:52',NULL,NULL,NULL,'2026-06-18 19:19:30','2026-06-18 19:30:43'),(2,'PED-8FD4F0',3,'COM_COMPRA','PRODUTO_PAGO','PORTAL',NULL,100.00,1.00,1.00,110.00,NULL,'2026-06-18 19:46:20','2026-06-18 19:46:45',NULL,NULL,NULL,'2026-06-18 19:37:30','2026-06-18 20:00:36'),(3,'PED-ABF75C',4,'COM_COMPRA','CONCLUIDO','PORTAL',NULL,200.00,0.00,10.00,2.00,'bnkfsabfsa','2026-06-18 20:36:12','2026-06-18 20:37:00',NULL,NULL,NULL,'2026-06-18 20:33:14','2026-06-18 20:39:36');
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utilizadores`
--

DROP TABLE IF EXISTS `utilizadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `utilizadores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(120) NOT NULL,
  `email` varchar(120) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `perfil` enum('ADMIN','OPERADOR') NOT NULL,
  `activo` tinyint(1) NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_utilizadores_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utilizadores`
--

LOCK TABLES `utilizadores` WRITE;
/*!40000 ALTER TABLE `utilizadores` DISABLE KEYS */;
INSERT INTO `utilizadores` VALUES (1,'Administrador','admin@conneximportacoes.co.mz','$2b$12$futWjQ/sW7bzHe0zwQ3UeetPV8rmrJqyhaMT1gQ15xh0u04B3Hpuy','ADMIN',1,'2026-06-12 17:35:41');
/*!40000 ALTER TABLE `utilizadores` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-04 18:58:45
