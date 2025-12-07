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
function analyzeContent(content, depth, document) {
  if (!content) return;

  const indent = "  ".repeat(depth);

  content.forEach((element, index) => {
    // すべての要素の生データを確認（デバッグ用）
    Logger.log(indent + "🔍 Element " + index + " keys: " + Object.keys(element).join(", "));

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
          // 各要素の種類を確認
          Logger.log(indent + "  🔍 Element " + paraIndex + " types: " + Object.keys(paraElement).join(", "));

          // テキスト要素
          if (paraElement.textRun) {
            const text = paraElement.textRun.content.trim();
            if (text) {
              Logger.log(indent + "  📝 Text: " + text);
              // textStyle も確認
              if (paraElement.textRun.textStyle) {
                Logger.log(indent + "    Style: " + JSON.stringify(paraElement.textRun.textStyle));
              }
            }
          }

          // ★ プルダウン要素（richLink）
          if (paraElement.richLink) {
            Logger.log(indent + "  🎯 RichLink detected:");
            Logger.log(indent + "    URL: " + paraElement.richLink.richLinkProperties.uri);
            Logger.log(indent + "    Title: " + paraElement.richLink.richLinkProperties.title);
            Logger.log(indent + "    Full: " + JSON.stringify(paraElement.richLink, null, 2));
          }

          // ★ インラインオブジェクト（プルダウンの可能性）
          if (paraElement.inlineObjectElement) {
            Logger.log(indent + "  🎯 InlineObject detected:");
            Logger.log(indent + "    Object ID: " + paraElement.inlineObjectElement.inlineObjectId);
            Logger.log(indent + "    Full data: " + JSON.stringify(paraElement.inlineObjectElement, null, 2));

            // ドキュメント全体からinlineObjectsを探す
            if (document && document.inlineObjects) {
              const objId = paraElement.inlineObjectElement.inlineObjectId;
              const inlineObj = document.inlineObjects[objId];
              if (inlineObj) {
                Logger.log(indent + "    Referenced object: " + JSON.stringify(inlineObj, null, 2));
              }
            }
          }

          // 人物チップ
          if (paraElement.person) {
            Logger.log(indent + "  👤 Person: " + paraElement.person.personProperties.name);
          }

          // その他の要素タイプを全て表示
          const knownTypes = ['textRun', 'richLink', 'inlineObjectElement', 'person'];
          Object.keys(paraElement).forEach(key => {
            if (!knownTypes.includes(key)) {
              Logger.log(indent + "  ❓ Unknown type '" + key + "': " + JSON.stringify(paraElement[key], null, 2));
            }
          });
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
                analyzeContent(cell.content, depth + 2, document);
              }
            });
          }
        });
      }
    }
  });
}
