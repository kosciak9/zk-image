import { DB } from "https://deno.land/x/sqlite@v3.7.3/mod.ts";
import { customAlphabet } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { Table } from "https://deno.land/x/cliffy@v1.0.0-rc.3/table/mod.ts";
import { Input } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 16);

const zkLocation = Deno.env.get("ZK_NOTEBOOK_DIR");

if (!zkLocation) {
  console.error("ZK_NOTEBOOK_DIR environment variable not set.");
  Deno.exit(1);
}

const db = new DB(`${zkLocation}/images/db.sqlite`);
db.execute(`
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    description TEXT,
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

await new Command()
  .name("zk-image")
  .description("A command line tool for managing 'zettelkasten' images.")
  .version("v1.0.0")
  .command("insert", "add image to the database")
  .option("--description <image_description>", "description of the image")
  .option("--source <image_source>", "source of the image")
  .option("--url", "image is hosted on the internet")
  .arguments("<path_to_image:string>")
  .action(async ({ description, source, url }, path) => {
    let actualDescription = description;
    while (actualDescription === undefined || actualDescription === "") {
      actualDescription = await Input.prompt({
        message: "Description of the image",
      });
    }

    const id = nanoid();

    if (url === true) {
      const response = fetch(path, { method: "GET" });
      const blob = await response.then((res) => res.blob());
      await Deno.writeFile(
        `${zkLocation}/images/${id}.jpg`,
        new Uint8Array(await blob.arrayBuffer()),
      );
    } else {
      await Deno.copyFile(
        await Deno.realPath(path),
        `${zkLocation}/images/${id}.jpg`,
      );
    }

    const insertQuery = db.prepareQuery(
      "INSERT INTO images (id, description, source) VALUES (?, ?, ?)",
    );

    insertQuery.execute([id, actualDescription, source]);
    insertQuery.finalize();

    console.log(
      `Inserted image with ID: ${id} and description: "${actualDescription}"`,
    );
  })
  .command("search", "query image database")
  .option(
    "--format <format>",
    "return list format, available: json, plain (default: plain)",
  )
  .arguments("<term:string>")
  .action(({ format }, term) => {
    const results = db.query<[string, string, string, string]>(
      "SELECT * FROM images WHERE description LIKE ? OR source LIKE ?",
      [`%${term}%`, `%${term}%`],
    );

    const resultsTable = new Table();
    resultsTable.header(["ID", "Description", "Source", "Created At"]);

    if (format === "json") {
      const objects = [];
      for (const [id, description, source, createdAt] of results) {
        objects.push({ id, description, source, createdAt });
      }
      console.log(JSON.stringify(objects));
    } else {
      for (const [id, description, source, createdAt] of results) {
        resultsTable.push([id, description, source, createdAt]);
      }
      resultsTable.maxColWidth(20).padding(1).indent(2).border();

      resultsTable.render();
    }
  })
  .command("delete", "delete image from the database")
  .arguments("<image_id:string>")
  .action((_, id) => {
    if (id === undefined) {
      console.error("ID of the image has to be provided");
      Deno.exit(1);
    }
    const deleteQuery = db.prepareQuery("DELETE FROM images WHERE id = ?");
    deleteQuery.execute([id]);
    deleteQuery.finalize();

    Deno.remove(`${zkLocation}/images/${id}.jpg`);
  })
  .parse();
