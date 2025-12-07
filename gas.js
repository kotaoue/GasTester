function getByGas() {
  const doc = DocumentApp.getActiveDocument();
  Logger.log("Document Name: " + doc.getName());

  const body = doc.getBody();
  const text = body.getText();
  Logger.log("Document Body: " + text);

  // body にある段落を全て取得してプルダウンを探す
  const paragraphs = body.getParagraphs();

  paragraphs.forEach(function (paragraph) {
    Logger.log("Paragraph Text: " + paragraph.getText());
    const numChildren = paragraph.getNumChildren();

    for (let i = 0; i < numChildren; i++) {
      const child = paragraph.getChild(i);
      const childType = child.getType();

      Logger.log("Child " + i + " type: " + childType);

      // 全ての子要素タイプをチェック
      try {
        // UNSUPPORTED タイプ(プルダウンの可能性)
        if (childType === DocumentApp.ElementType.UNSUPPORTED) {
          Logger.log("Found UNSUPPORTED element - likely a dropdown");

          // 利用可能なメソッドを確認
          const methods = [];
          for (let prop in child) {
            if (typeof child[prop] === 'function') {
              methods.push(prop);
            }
          }
          Logger.log("Available methods: " + methods.join(", "));

          // プロトタイプのメソッドも確認
          const protoMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(child));
          Logger.log("Prototype methods: " + protoMethods.join(", "));

          // 異なるアプローチを試す
          try {
            // getType() で詳細を確認
            Logger.log("Element type: " + child.getType());

            // getAttributes() が使えるか試す
            if (typeof child.getAttributes === 'function') {
              const attrs = child.getAttributes();
              Logger.log("Attributes: " + JSON.stringify(attrs));
            }

            // getText() が使えるか試す
            if (typeof child.getText === 'function') {
              Logger.log("Text: " + child.getText());
            }

            // editAsText() が使えるか試す
            if (typeof child.editAsText === 'function') {
              const textElement = child.editAsText();
              Logger.log("As text: " + textElement.getText());
            }
          } catch (e) {
            Logger.log("Error accessing element properties: " + e.toString());
          }
        }
        // Rich Link (プルダウン)の可能性
        else if (childType === DocumentApp.ElementType.RICH_LINK) {
          const richLink = child.asRichLink();
          Logger.log("Found Rich Link: " + richLink.getUrl());
        }
        // テキスト要素
        else if (childType === DocumentApp.ElementType.TEXT) {
          const textElement = child.asText();
          Logger.log("Text content: " + textElement.getText());
        }
      } catch (e) {
        Logger.log("Error processing child " + i + ": " + e.toString());
      }
    }
  });
}

/**
 * Google Docs APIを使用してプルダウン要素にアクセスする
 *
 * 事前準備:
 * 1. Apps Scriptエディタで左側の「サービス」の横にある「+」をクリック
 * 2. 「Google Docs API」を検索して追加
 * 3. 識別子を "Docs" にする（デフォルト）
 *
 * 参考:
 * - https://developers.google.com/docs/api/reference/rest/v1/documents/get
 * - https://developers.google.com/apps-script/guides/services/advanced
 */
function getByApi() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const docId = doc.getId();

    Logger.log("=== Google Docs API を使用したプルダウンの取得 ===");
    Logger.log("Document ID: " + docId);

    // Google Docs APIを使用してドキュメントを取得
    const document = Docs.Documents.get(docId);

    Logger.log("\nDocument retrieved successfully");
    Logger.log("Title: " + document.title);

    // ドキュメントの内容を解析
    if (document.body && document.body.content) {
      Logger.log("\n=== ドキュメント構造の解析 ===");
      analyzeContent(document.body.content, 0);
    }

    // インラインオブジェクトをチェック（プルダウンの可能性）
    if (document.inlineObjects) {
      Logger.log("\n=== Inline Objects（プルダウン候補）===");
      const objectIds = Object.keys(document.inlineObjects);
      Logger.log("Total inline objects: " + objectIds.length);

      objectIds.forEach(objectId => {
        const obj = document.inlineObjects[objectId];
        Logger.log("\n📦 Object ID: " + objectId);

        if (obj.inlineObjectProperties && obj.inlineObjectProperties.embeddedObject) {
          const embedded = obj.inlineObjectProperties.embeddedObject;
          Logger.log("  Title: " + embedded.title);
          Logger.log("  Description: " + embedded.description);
          Logger.log("  Full object: " + JSON.stringify(embedded, null, 2));
        }
      });
    }

  } catch (e) {
    Logger.log("❌ エラー: " + e.toString());
    Logger.log("\n⚠️ Google Docs API が有効になっていない可能性があります");
    Logger.log("手順:");
    Logger.log("1. Apps Scriptエディタで左側の「サービス」の横にある「+」をクリック");
    Logger.log("2. 「Google Docs API」を検索");
    Logger.log("3. 追加して、識別子を「Docs」にする");
  }
}

/**
 * コンテンツを再帰的に解析してプルダウンを探す
 */
function analyzeContent(content, depth) {
  if (!content) return;

  const indent = "  ".repeat(depth);

  content.forEach((element, index) => {
    // 段落要素
    if (element.paragraph) {
      const para = element.paragraph;
      const paraText = para.elements
        ? para.elements.map(e => e.textRun ? e.textRun.content : '').join('').trim()
        : '';

      if (paraText) {
        Logger.log(indent + "📄 Paragraph: " + paraText);
      }

      if (para.elements) {
        para.elements.forEach((paraElement, paraIndex) => {
          // テキスト要素
          if (paraElement.textRun) {
            const text = paraElement.textRun.content.trim();
            if (text) {
              Logger.log(indent + "  📝 Text: " + text);
            }
          }

          // ★ プルダウン要素（richLink）
          if (paraElement.richLink) {
            Logger.log(indent + "  🎯 RichLink detected:");
            Logger.log(indent + "    URL: " + paraElement.richLink.richLinkProperties.uri);
            Logger.log(indent + "    Title: " + paraElement.richLink.richLinkProperties.title);
          }

          // ★ インラインオブジェクト（プルダウンの可能性）
          if (paraElement.inlineObjectElement) {
            Logger.log(indent + "  🎯 InlineObject detected:");
            Logger.log(indent + "    Object ID: " + paraElement.inlineObjectElement.inlineObjectId);
            Logger.log(indent + "    Full data: " + JSON.stringify(paraElement.inlineObjectElement, null, 2));
          }

          // 人物チップ
          if (paraElement.person) {
            Logger.log(indent + "  👤 Person: " + paraElement.person.personProperties.name);
          }
        });
      }
    }

    // テーブル要素
    if (element.table) {
      Logger.log(indent + "📊 Table");
      if (element.table.tableRows) {
        element.table.tableRows.forEach((row, rowIndex) => {
          if (row.tableCells) {
            row.tableCells.forEach((cell, cellIndex) => {
              if (cell.content) {
                Logger.log(indent + `  Cell[${rowIndex}][${cellIndex}]:`);
                analyzeContent(cell.content, depth + 2);
              }
            });
          }
        });
      }
    }
  });
}
