/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  CommandListenerHighPriority,
  ElementNode,
  RangeSelection,
} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import {useEffect} from 'react';
import {$getSelection, $isElementNode, $isRangeSelection} from 'lexical';
import {$isListItemNode, $isListNode, $getListDepth} from '@lexical/list';

type Props = $ReadOnly<{
  maxDepth: ?number,
}>;

function getElementNodesInSelection(
  selection: RangeSelection,
): Set<ElementNode> {
  const nodesInSelection = selection.getNodes();

  if (nodesInSelection.length === 0) {
    return new Set([
      selection.anchor.getNode().getParentOrThrow(),
      selection.focus.getNode().getParentOrThrow(),
    ]);
  }

  return new Set(
    nodesInSelection.map((n) => ($isElementNode(n) ? n : n.getParentOrThrow())),
  );
}

const highPriority: CommandListenerHighPriority = 3;

function isIndentPermitted(maxDepth: number): boolean {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return false;
  }

  const elementNodesInSelection: Set<ElementNode> =
    getElementNodesInSelection(selection);

  let totalDepth = 0;

  for (const elementNode of elementNodesInSelection) {
    if ($isListNode(elementNode)) {
      totalDepth = Math.max($getListDepth(elementNode) + 1, totalDepth);
    } else if ($isListItemNode(elementNode)) {
      const parent = elementNode.getParent();
      if (!$isListNode(parent)) {
        throw new Error(
          'ListMaxIndentLevelPlugin: A ListItemNode must have a ListNode for a parent.',
        );
      }

      totalDepth = Math.max($getListDepth(parent) + 1, totalDepth);
    }
  }

  return totalDepth <= maxDepth;
}

export default function ListMaxIndentLevelPlugin({maxDepth}: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.addListener(
      'command',
      (type) => {
        if (type !== 'indentContent') {
          return false;
        }

        return !isIndentPermitted(maxDepth ?? 7);
      },
      highPriority,
    );
  }, [editor, maxDepth]);

  return null;
}