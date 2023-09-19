import "dotenv/config.js";

import express from "express";
import { Client } from "@elastic/elasticsearch";
import { DataSource, In } from "typeorm";
import Product from "./Product.js";
import ProductVariant from "./ProductVariant.js";

const dataSource = new DataSource({
  type: "mariadb",
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  entities: [Product, ProductVariant],
  logging: ["query", "error"],
});
const client = new Client({
  node: process.env.ELASTIC_URL,
  auth: {
    password: process.env.ELASTIC_PASSWORD,
    username: process.env.ELASTIC_USERNAME,
  },
});

const app = express();

app.get("/search", async (req, res) => {
  return res.json(
    (
      await client.search({
        size: 100,
        index: "ss_product",
        _source: ["name", "price", "_id", "compare_at_price", "slug"],
        fields: ["name", "price", "_id", "compare_at_price", "slug"],
        highlight: {
          fragment_size: 300,
          fields: {
            name: { force_source: true },
          },
        },
        query: {
          bool: {
            must: [
              {
                query_string: {
                  query: "Nguồn *",
                },
              },
            ],
          },
        },
      })
    ).hits.hits
  );
});

app.listen(3000, () => {
  console.log("app listen http://localhost:3000");
});

async function createIndices() {
  return console.log(await client.cat.indices());
  const result = await client.indices.create({
    index: "ss_product",
    settings: {
      // If you are not using the singleton instance, change this to your own
      number_of_replicas: 0,
      number_of_shards: 1,
    },
    mappings: {
      properties: {
        id: { type: "integer" },
        shop_id: { type: "integer" },
        variant_id: { type: "integer" },
        in_stock: { type: "short" },
        in_suggest: { type: "short" },
        price: { type: "long" },
        compare_at_price: { type: "long" },
        name: { type: "text", fielddata: true },
        short_name: { type: "text", fielddata: true },
        image_path: { type: "text" },
        tags: { type: "text" },
        slug: { type: "text" },
      },
    },
  });
  console.log(result);
}

// createIndices()

async function bootstrap() {
  // return console.log(await client.cluster.health())
  // return console.log((await client.search({
  //   index: 'ss_product',
  //   size: 20
  // })).hits.hits)
  // return console.log((await client.search({
  //   size: 5,
  //   index: 'ss_product',
  //   _source: ['name', 'price', '_id', 'compare_at_price', 'slug'],
  //   fields: ['name', 'price', '_id', 'compare_at_price', 'slug'],
  //   highlight: {
  //     fragment_size: 300,
  //     fields: {
  //       name: { force_source: true }
  //     }
  //   },
  //   query: {
  //     bool: {
  //       must: [
  //         {
  //           query_string: {
  //             query: 'Nguồn *'
  //           }
  //         }
  //       ]
  //     }
  //   }
  // })).hits.hits)
  await dataSource.initialize();
  try {
    const VariantRepository = dataSource.getRepository(ProductVariant);
    await VariantRepository.update(
      {
        shop_id: 2,
      },
      {
        elastic_status: 0,
      }
    );
    const limit = 100;
    let flag = true;
    while (flag) {
      const products = await dataSource.query(`SELECT 
      v.id, v.sku, v.name, v.price, v.compare_at_price, v.in_stock, v.image_path, v.product_variant_shop_id,
      p.is_suggest, p.slug, p.tags, p.name as product_name, p.is_active, p.product_shop_id
    FROM product_variants v
    JOIN products p on p.product_shop_id = v.product_id
    WHERE p.shop_id = 2
    AND v.elastic_status = 0
    LIMIT ${limit}`);
      const bulkResponse = await client.bulk({
        index: "ss_product",
        operations: products.flatMap((product) => {
          const name =
            product.name === "Default Title"
              ? product.product_name
              : product.product_name + " " + product.name;
          const shortName = name.split(" ").slice(0, 5).join(" ");
          return [
            {
              index: {
                _id: product.product_variant_shop_id,
              },
            },
            { ...product, name, short_name: shortName },
          ];
        }),
      });
      if (bulkResponse.errors) {
        const erroredDocuments = [];
        // The items array has the same order of the dataset we just indexed.
        // The presence of the `error` key indicates that the operation
        // that we did for the document has failed.
        bulkResponse.items.forEach((action, i) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              // If the status is 429 it means that you can retry the document,
              // otherwise it's very likely a mapping error, and you should
              // fix the document before to try it again.
              status: action[operation].status,
              error: action[operation].error,
              operation: operations[i * 2],
              document: operations[i * 2 + 1],
            });
          }
        });
        console.log(erroredDocuments);
      }
      await VariantRepository.update(
        {
          id: In(products.map((product) => product.id)),
        },
        {
          elastic_status: 1,
        }
      );
      if (products.length < limit) flag = false;
    }
    const count = await client.count({
      index: "ss_product",
    });
    return console.log(count);
    return console.log(await client.cluster.health());
    const res = await client.indices.create({
      index: "test",
      settings: {
        number_of_replicas: 0,
      },
    });
    console.log(res);
  } catch (err) {
    console.log(err);
  } finally {
    dataSource.destroy();
  }
}

bootstrap();
setInterval(bootstrap, 10000);
