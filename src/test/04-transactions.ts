import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";

describe("Transactions", () => {
  let db: Database;
  before(() => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
  });
  after(() => {
    db.close();
  });
  describe("database.executeTransaction", () => {
    it("should execute a transaction and return the result", async () => {
      const result = await db.executeTransaction(
        [],
        "function (params) {return params;}",
        { params: "test" }
      );
      expect(result).to.equal("test");
    });
  });
  describe("stream transactions", () => {
    const name = `testdb_${Date.now()}`;
    let collection: DocumentCollection;
    before(async () => {
      await db.createDatabase(name);
      db.useDatabase(name);
    });
    after(async () => {
      db.useDatabase("_system");
      await db.dropDatabase(name);
    });
    beforeEach(async () => {
      collection = db.collection(`collection-${Date.now()}`);
      await collection.create();
    });
    afterEach(async () => {
      try {
        await collection.get();
      } catch (e) {
        return;
      }
      await collection.drop();
    });

    it("can commit an empty transaction", async () => {
      const trx = await db.beginTransaction(collection);
      {
        const { id, status } = await trx.get();
        expect(id).to.equal(trx.id);
        expect(status).to.equal("running");
      }
      {
        const trx2 = db.transaction(trx.id);
        const { id, status } = await trx2.get();
        expect(id).to.equal(trx.id);
        expect(status).to.equal("running");
      }
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
    });

    it("can abort an empty transaction", async () => {
      const trx = await db.beginTransaction(collection);
      const { id, status } = await trx.abort();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("aborted");
    });

    it("can insert a document", async () => {
      const trx = await db.beginTransaction(collection);
      const meta = await trx.run(() => collection.save({ _key: "test" }));
      expect(meta).to.have.property("_key", "test");
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
      const doc = await collection.document("test");
      expect(doc).to.have.property("_key", "test");
    });

    it("does not leak when inserting a document", async () => {
      const trx = await db.beginTransaction(collection);
      await trx.run(() => collection.save({ _key: "test" }));
      let doc: any;
      try {
        doc = await collection.document("test");
      } catch (e) {}
      if (doc) expect.fail("Document should not exist yet.");
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
    });

    it("does not insert a document when aborted", async () => {
      const trx = await db.beginTransaction(collection);
      const meta = await trx.run(() => collection.save({ _key: "test" }));
      expect(meta).to.have.property("_key", "test");
      const { id, status } = await trx.abort();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("aborted");
      let doc: any;
      try {
        doc = await collection.document("test");
      } catch (e) {}
      if (doc) expect.fail("Document should not exist yet.");
    });
  });
});
