CREATE TABLE IF NOT EXISTS `banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`imagem_url` text NOT NULL,
	`link_url` text,
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`inicio` timestamp NULL,
	`fim` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`parent_id` int,
	`imagem_url` text,
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE IF NOT EXISTS `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(100) NOT NULL,
	`tipo` enum('percentual','valor_fixo','frete_gratis') NOT NULL,
	`valor` decimal(10,2),
	`usos_max` int,
	`usos_atuais` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`validade` timestamp NULL,
	`pedido_minimo` decimal(10,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_codigo_unique` UNIQUE(`codigo`)
);

CREATE TABLE IF NOT EXISTS `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(50) NOT NULL,
	`status` enum('pendente','confirmado','separando','saiu_entrega','entregue','cancelado') NOT NULL DEFAULT 'pendente',
	`cliente_nome` varchar(255) NOT NULL,
	`cliente_telefone` varchar(20) NOT NULL,
	`cliente_email` varchar(255),
	`endereco` json NOT NULL,
	`delivery_slot` json,
	`subtotal` decimal(10,2) NOT NULL,
	`desconto` decimal(10,2) NOT NULL DEFAULT '0',
	`frete` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`pagamento_tipo` enum('pix','cartao','boleto') NOT NULL,
	`pagamento_status` enum('aguardando','aprovado','recusado','reembolsado') NOT NULL DEFAULT 'aguardando',
	`mp_payment_id` varchar(255),
	`coupon_id` int,
	`notas` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_numero_unique` UNIQUE(`numero`)
);

CREATE TABLE IF NOT EXISTS `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(500) NOT NULL,
	`slug` varchar(500) NOT NULL,
	`descricao` mediumtext,
	`preco` decimal(10,2) NOT NULL,
	`preco_de` decimal(10,2),
	`sku` varchar(255),
	`categoria_id` int,
	`imagens` json NOT NULL DEFAULT ('[]'),
	`is_kg` boolean NOT NULL DEFAULT false,
	`estoque` decimal(10,3) NOT NULL DEFAULT '0',
	`ativo` boolean NOT NULL DEFAULT true,
	`woo_id` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `products_woo_id_unique` UNIQUE(`woo_id`)
);

CREATE TABLE IF NOT EXISTS `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int,
	`nome_snapshot` varchar(500) NOT NULL,
	`preco_snapshot` decimal(10,2) NOT NULL,
	`imagem_snapshot` text,
	`quantidade` decimal(10,3) NOT NULL,
	`is_kg` boolean NOT NULL DEFAULT false,
	`subtotal` decimal(10,2) NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` enum('percentual','valor_fixo','compre_x_leve_y','combo') NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`valor` decimal(10,2),
	`produto_id` int,
	`categoria_id` int,
	`compra_qtd` int,
	`leve_qtd` int,
	`produto_brinde_id` int,
	`ativo` boolean NOT NULL DEFAULT true,
	`inicio` timestamp NULL,
	`fim` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `scheduled_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int,
	`campo` enum('preco','preco_de','estoque','ativo') NOT NULL,
	`valor_novo` varchar(255) NOT NULL,
	`executa_em` timestamp NOT NULL,
	`executado` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_updates_id` PRIMARY KEY(`id`)
);

ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `orders` ADD CONSTRAINT `orders_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `products` ADD CONSTRAINT `products_categoria_id_categories_id_fk` FOREIGN KEY (`categoria_id`) REFERENCES `categories`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_produto_id_products_id_fk` FOREIGN KEY (`produto_id`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_categoria_id_categories_id_fk` FOREIGN KEY (`categoria_id`) REFERENCES `categories`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_produto_brinde_id_products_id_fk` FOREIGN KEY (`produto_brinde_id`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `scheduled_updates` ADD CONSTRAINT `scheduled_updates_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS `orders_numero_idx` ON `orders` (`numero`);
CREATE INDEX IF NOT EXISTS `orders_status_idx` ON `orders` (`status`);
CREATE INDEX IF NOT EXISTS `orders_created_at_idx` ON `orders` (`created_at`);
CREATE INDEX IF NOT EXISTS `products_slug_idx` ON `products` (`slug`);
CREATE INDEX IF NOT EXISTS `products_woo_id_idx` ON `products` (`woo_id`);
CREATE INDEX IF NOT EXISTS `products_categoria_id_idx` ON `products` (`categoria_id`);
CREATE INDEX IF NOT EXISTS `products_ativo_idx` ON `products` (`ativo`);
