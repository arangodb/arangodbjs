import {
  ArangoCollection,
  Collection,
  CollectionInsertResult,
  CollectionRemoveResult,
  CollectionSaveResult,
  Document,
  DocumentCollection,
  DocumentData,
  documentHandle,
  DocumentSelector,
  Edge,
  EdgeCollection,
  EdgeData,
  isArangoCollection,
  TraversalOptions
} from "./collection";
import { Connection } from "./connection";
import { isArangoError } from "./error";
import { Headers } from "./route";
import { DOCUMENT_NOT_FOUND, GRAPH_NOT_FOUND } from "./util/codes";
import { Patch } from "./util/types";

function mungeGharialResponse(body: any, prop: "vertex" | "edge" | "removed") {
  const { new: newDoc, old: oldDoc, [prop]: doc, ...meta } = body;
  const result = { ...meta, ...doc };
  if (typeof newDoc !== "undefined") result.new = newDoc;
  if (typeof oldDoc !== "undefined") result.old = oldDoc;
  return result;
}

export type CollectionInsertOptions = {
  waitForSync?: boolean;
  returnNew?: boolean;
};

export type CollectionReadOptions = {
  rev?: string;
  graceful?: boolean;
  allowDirtyRead?: boolean;
};

export type CollectionReplaceOptions = {
  rev?: string;
  waitForSync?: boolean;
  keepNull?: boolean;
  returnOld?: boolean;
  returnNew?: boolean;
};

export type CollectionRemoveOptions = {
  rev?: string;
  waitForSync?: boolean;
  returnOld?: boolean;
};

export class GraphVertexCollection<T extends object = any>
  implements ArangoCollection {
  isArangoCollection: true = true;
  private _connection: Connection;
  private _name: string;

  graph: Graph;
  collection: DocumentCollection<T>;

  constructor(connection: Connection, name: string, graph: Graph) {
    this._connection = connection;
    this._name = name;
    this.graph = graph;
    this.collection = new Collection(connection, name);
  }

  get name() {
    return this._name;
  }

  vertexExists(selector: DocumentSelector): Promise<boolean> {
    return this._connection
      .request(
        {
          method: "HEAD",
          path: `/_api/gharial/${this.graph.name}/vertex/${documentHandle(
            selector,
            this._name
          )}`
        },
        () => true
      )
      .catch(err => {
        if (err.statusCode === 404) {
          return false;
        }
        throw err;
      });
  }

  vertex(
    selector: DocumentSelector,
    options?: CollectionReadOptions
  ): Promise<Document<T>>;
  vertex(selector: DocumentSelector, graceful: boolean): Promise<Document<T>>;
  vertex(
    selector: DocumentSelector,
    options: boolean | CollectionReadOptions = {}
  ): Promise<Document<T>> {
    if (typeof options === "boolean") {
      options = { graceful: options };
    }
    const {
      allowDirtyRead = undefined,
      graceful = false,
      rev,
      ...qs
    } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    const result = this._connection.request(
      {
        path: `/_api/gharial/${this.graph.name}/vertex/${documentHandle(
          selector,
          this._name
        )}`,
        headers,
        qs,
        allowDirtyRead
      },
      res => res.body.vertex
    );
    if (!graceful) return result;
    return result.catch(err => {
      if (isArangoError(err) && err.errorNum === DOCUMENT_NOT_FOUND) {
        return null;
      }
      throw err;
    });
  }

  save(
    data: DocumentData<T>,
    options?: CollectionInsertOptions
  ): Promise<CollectionInsertResult<Document<T>>> {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.graph.name}/vertex/${this._name}`,
        body: data,
        qs: options
      },
      res => mungeGharialResponse(res.body, "vertex")
    );
  }

  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    options: CollectionReplaceOptions = {}
  ): Promise<CollectionSaveResult<Document<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...qs } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this.graph.name}/vertex/${documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs,
        headers
      },
      res => mungeGharialResponse(res.body, "vertex")
    );
  }

  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    options: CollectionReplaceOptions = {}
  ): Promise<CollectionSaveResult<Document<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const headers: Headers = {};
    const { rev, ...qs } = options;
    if (rev) headers["if-match"] = rev;
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/gharial/${this.graph.name}/vertex/${documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs,
        headers
      },
      res => mungeGharialResponse(res.body, "vertex")
    );
  }

  remove(
    selector: DocumentSelector,
    options: CollectionRemoveOptions = {}
  ): Promise<CollectionRemoveResult<Document<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const headers: Headers = {};
    const { rev, ...qs } = options;
    if (rev) headers["if-match"] = rev;
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this.graph.name}/vertex/${documentHandle(
          selector,
          this._name
        )}`,
        qs,
        headers
      },
      res => mungeGharialResponse(res.body, "removed")
    );
  }
}

export class GraphEdgeCollection<T extends object = any>
  implements ArangoCollection {
  isArangoCollection: true = true;
  private _connection: Connection;
  private _name: string;

  graph: Graph;
  collection: EdgeCollection<T>;

  constructor(connection: Connection, name: string, graph: Graph) {
    this._connection = connection;
    this._name = name;
    this.graph = graph;
    this.collection = new Collection(connection, name);
  }

  get name() {
    return this._name;
  }

  edgeExists(selector: DocumentSelector): Promise<boolean> {
    return this._connection
      .request(
        {
          method: "HEAD",
          path: `/_api/gharial/${this.graph.name}/edge/${documentHandle(
            selector,
            this._name
          )}`
        },
        () => true
      )
      .catch(err => {
        if (err.statusCode === 404) {
          return false;
        }
        throw err;
      });
  }

  edge(selector: DocumentSelector, graceful: boolean): Promise<Edge<T>>;
  edge(
    selector: DocumentSelector,
    options?: CollectionReadOptions
  ): Promise<Edge<T>>;
  edge(
    selector: DocumentSelector,
    options: boolean | CollectionReadOptions = {}
  ): Promise<Edge<T>> {
    if (typeof options === "boolean") {
      options = { graceful: options };
    }
    const {
      allowDirtyRead = undefined,
      graceful = false,
      rev,
      ...qs
    } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    const result = this._connection.request(
      {
        path: `/_api/gharial/${this.graph.name}/edge/${documentHandle(
          selector,
          this._name
        )}`,
        qs,
        allowDirtyRead
      },
      res => res.body.edge
    );
    if (!graceful) return result;
    return result.catch(err => {
      if (isArangoError(err) && err.errorNum === DOCUMENT_NOT_FOUND) {
        return null;
      }
      throw err;
    });
  }

  save(
    data: EdgeData<T>,
    options?: CollectionInsertOptions
  ): Promise<CollectionInsertResult<Edge<T>>> {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.graph.name}/edge/${this._name}`,
        body: data,
        qs: options
      },
      res => mungeGharialResponse(res.body, "edge")
    );
  }

  replace(
    selector: DocumentSelector,
    newValue: EdgeData<T>,
    options: CollectionReplaceOptions = {}
  ): Promise<CollectionSaveResult<Edge<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...qs } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this.graph.name}/edge/${documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs,
        headers
      },
      res => mungeGharialResponse(res.body, "edge")
    );
  }

  update(
    selector: DocumentSelector,
    newValue: Patch<EdgeData<T>>,
    options: CollectionReplaceOptions = {}
  ): Promise<CollectionSaveResult<Edge<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...qs } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/gharial/${this.graph.name}/edge/${documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs,
        headers
      },
      res => mungeGharialResponse(res.body, "edge")
    );
  }

  remove(
    selector: DocumentSelector,
    options: CollectionRemoveOptions = {}
  ): Promise<CollectionRemoveResult<Edge<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...qs } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this.graph.name}/edge/${documentHandle(
          selector,
          this._name
        )}`,
        qs,
        headers
      },
      res => mungeGharialResponse(res.body, "removed")
    );
  }
}

export type EdgeDefinition = {
  collection: string;
  from: string[];
  to: string[];
};

export type GraphInfo = {
  _id: string;
  _key: string;
  _rev: string;
  name: string;
  isSmart: boolean;
  smartGraphAttribute?: string;
  edgeDefinitions: EdgeDefinition[];
  orphanCollections: string[];
  minReplicationFactor: number;
  numberOfShards: number;
  replicationFactor: number;
};

export type GraphCreateOptions = {
  waitForSync?: boolean;
  /** Enterprise Edition only */
  isSmart?: boolean;
  /** Enterprise Edition only */
  smartGraphAttribute?: string;
  numberOfShards?: number;
  replicationFactor?: number;
  minReplicationFactor?: number;
};

export class Graph {
  private _name: string;

  private _connection: Connection;

  constructor(connection: Connection, name: string) {
    this._name = name;
    this._connection = connection;
  }

  get name() {
    return this._name;
  }

  get(): Promise<GraphInfo> {
    return this._connection.request(
      { path: `/_api/gharial/${this._name}` },
      res => res.body.graph
    );
  }

  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === GRAPH_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  create(
    edgeDefinitions: EdgeDefinition[],
    options?: GraphCreateOptions
  ): Promise<GraphInfo> {
    const { waitForSync, isSmart, ...opts } = options || {};
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/gharial",
        body: {
          properties: { edgeDefinitions, isSmart },
          name: this._name,
          options: opts
        },
        qs: { waitForSync }
      },
      res => res.body.graph
    );
  }

  drop(dropCollections: boolean = false): Promise<boolean> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}`,
        qs: { dropCollections }
      },
      res => res.body.removed
    );
  }

  vertexCollection<T extends object = any>(
    collectionName: string
  ): GraphVertexCollection<T> {
    return new GraphVertexCollection<T>(this._connection, collectionName, this);
  }

  listVertexCollections(): Promise<string[]> {
    return this._connection.request(
      { path: `/_api/gharial/${this._name}/vertex` },
      res => res.body.collections
    );
  }

  async vertexCollections(): Promise<GraphVertexCollection[]> {
    const names = await this.listVertexCollections();
    return names.map(
      name => new GraphVertexCollection(this._connection, name, this)
    );
  }

  addVertexCollection(
    collection: string | ArangoCollection
  ): Promise<GraphInfo> {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this._name}/vertex`,
        body: { collection }
      },
      res => res.body.graph
    );
  }

  removeVertexCollection(
    collection: string | ArangoCollection,
    dropCollection: boolean = false
  ): Promise<GraphInfo> {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}/vertex/${collection}`,
        qs: {
          dropCollection
        }
      },
      res => res.body.graph
    );
  }

  edgeCollection<T extends object = any>(
    collectionName: string
  ): GraphEdgeCollection<T> {
    return new GraphEdgeCollection<T>(this._connection, collectionName, this);
  }

  listEdgeCollections(): Promise<string[]> {
    return this._connection.request(
      { path: `/_api/gharial/${this._name}/edge` },
      res => res.body.collections
    );
  }

  async edgeCollections(): Promise<GraphEdgeCollection[]> {
    const names = await this.listEdgeCollections();
    return names.map(
      name => new GraphEdgeCollection(this._connection, name, this)
    );
  }

  addEdgeDefinition(definition: EdgeDefinition): Promise<GraphInfo> {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this._name}/edge`,
        body: definition
      },
      res => res.body.graph
    );
  }

  replaceEdgeDefinition(definition: EdgeDefinition): Promise<GraphInfo>;
  replaceEdgeDefinition(
    edgeCollection: string,
    definition: EdgeDefinition
  ): Promise<GraphInfo>;
  replaceEdgeDefinition(
    edgeCollection: string | EdgeDefinition,
    definition?: EdgeDefinition
  ) {
    if (!definition) {
      definition = edgeCollection as EdgeDefinition;
      edgeCollection = definition.collection;
    }
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this._name}/edge/${edgeCollection}`,
        body: definition
      },
      res => res.body.graph
    );
  }

  removeEdgeDefinition(
    edgeCollection: string,
    dropCollection: boolean = false
  ): Promise<GraphInfo> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}/edge/${edgeCollection}`,
        qs: {
          dropCollection
        }
      },
      res => res.body.graph
    );
  }

  /** @deprecated ArangoDB 3.4 */
  traversal(
    startVertex: DocumentSelector,
    options?: TraversalOptions
  ): Promise<any> {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/traversal`,
        body: {
          ...options,
          startVertex,
          graphName: this._name
        }
      },
      res => res.body.result
    );
  }
}
