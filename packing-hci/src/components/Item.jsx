import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faTrash, faCheck } from '@fortawesome/free-solid-svg-icons';
import "../styles/item.css";
import { itemCategories } from '../app/routes/itemCategories';
import { useRef, useEffect, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { updateContainer, updateItem } from '../lib/db';
import { pointerIntersection, directionBiased } from '@dnd-kit/collision';

const Item = ({
  item,
  setItems,
  listItems,
  onAddItem,
  isEditLike,
  isDraft,
  addDeletedItem,
  focusOnNewItems,
  index,
  group,
  dragging,
  hoverGroup,
  onItemPacked,
}) => {
  const nameInputRef = useRef(null);
  const isContainer = item.category == "Container";
  const { ref, handleRef } = useSortable({
    id: item.id,
    index: index,
    group: group,
    type: "item",
    accept: (draggable) => {
      return dragging != "Container" || group == "left" || group == "right";
    },
  });
  const { ref: listRef } = useDroppable({
    id: item.id + "%list",
    accept: "item",
    type: "containerList",
    collisionPriority: 2,
    collisionDetector: pointerIntersection,
  });
  const { ref: addItemRef, isDropTarget } = useDroppable({
    id: item.id + "%drop",
    accept: "item",
    type: "containerDrop",
  })

  const setActiveItem = (field, value) => {
    setItems(prev => {
      const column = prev[group].map(x => x.id === item.id ? (() => {
        x[field] = value;
        return x;
      })() : x);
      return {...prev, [group]: column};
    })
  }

  const changeItemCategory = (e) => {
    setActiveItem("category", e.target.value);
  };

  const changeItemSize = (e) => {
    setActiveItem("size", e.target.textContent.toLowerCase());
  };

  const changeItemName = (e) => {
    setActiveItem("name", e.target.value);
  };

  const deleteItem = () => {
    if (item.listItemId) addDeletedItem(item);
    if (isContainer) listItems?.forEach(listItem => listItem.listItemId ? addDeletedItem(listItem) : null);
    setItems(prev => {
      const column = prev[group].filter(x => x.id !== item.id);
      return {...prev, [group]: column};
    })
  };

  const onItemClick = () => {
    if (isContainer) {
      listItems?.forEach(listItem => {
        listItem.packed = !item.packed;
        updateItem(listItem.id, { packed: !item.packed });
      });
      updateContainer(item.id, { packed: !item.packed });
    } else {
      updateItem(item.id, { packed: !item.packed });
      if (item.container_id && item.packed) {
        setItems(prev => {return {
          ...prev,
          left: prev.left?.map(x => x.id == item.container_id ? {...x, packed: false} : x),
          right: prev.right?.map(x => x.id == item.container_id ? {...x, packed: false} : x),
        }});
        updateContainer(item.container_id, { packed: false });
      }
    }
    setActiveItem("packed", !item.packed);
    onItemPacked();
  }

  useEffect(() => {
    if (isEditLike && focusOnNewItems) nameInputRef.current?.focus();
  }, []);

  return (
    <div ref={isEditLike ? ref : null} className={`item rounded-4 ${!isEditLike && item.packed ? "item-packed" : ""}`} >
      <div
        className={`item-main ${!isEditLike ? "item-main-clickable" : ""}`}
        onClick={!isEditLike ? onItemClick : null}
        style={{backgroundColor: itemCategories[item.category].color}}
      >
        {isEditLike ? 
          <div className="item-grip-area" ref={handleRef}>
            <FontAwesomeIcon className="item-grip" icon={faGripVertical} />
          </div> : <div className="item-checkbox-area">
            <div className={`item-checkbox ${item.packed ? "item-checkbox-selected" : "item-checkbox-unselected"}`} />
            <FontAwesomeIcon className={`item-check ${item.packed ? "item-check-visible" : "item-check-invisible"}`} icon={faCheck} />
          </div>
        }
        {isEditLike && <FontAwesomeIcon className="item-delete" icon={faTrash} onClick={deleteItem} />}
        <div className="item-content">
          <div className="item-label">
            <FontAwesomeIcon className="item-icon" icon={itemCategories[item.category].icon} />
            <input ref={nameInputRef} readonly={!isEditLike} style={!isEditLike ? {pointerEvents: "none"} : {}} className="item-name" onChange={changeItemName} placeholder={isContainer ? "Container Name" : "Item Name"} value={item.name}></input>
          </div>
          <div className="item-sizes">
            {(isEditLike ? ["small", "medium", "large"] : [item.size]).map(size => 
              <p
                key={`item-size-${size}`}
                style={isEditLike ? {cursor: "pointer"} : {}}
                className={`item-size ${size == item.size ? "item-size-selected" : ""}`}
                onClick={isEditLike ? changeItemSize : null}
              >
                  {size.toUpperCase()}
              </p>
            )}
          </div>
          {(!isContainer && isEditLike) && <div className="item-category">
            <p className="item-category-label">Category: </p>
            <select className="item-category-select" value={item.category} onChange={changeItemCategory}>
              {Object.keys(itemCategories).filter(c => c != "Container").map(category =>
                <option key={`item-category-${category}`} value={category}>{category}</option>
              )}
            </select>
          </div>}
        </div>
      </div>
      {(isContainer && (isEditLike || listItems?.length > 0)) && <div
        ref={listRef}
        key={item.id + "%list"}
        className={`container-list ${hoverGroup == item.id + "%list" ? "container-list-dragging" : ""}`}
      >
        {listItems?.map((listItem, i) => <Item
          item={listItem}
          setItems={setItems}
          isEditLike={isEditLike}
          key={`${listItem.id}%item`}
          isDraft={isDraft}
          addDeletedItem={addDeletedItem}
          focusOnNewItems={focusOnNewItems}
          group={item.id + "%list"}
          index={i}
          dragging={dragging}
          hoverGroup={hoverGroup}
          onItemPacked={onItemPacked}
        />)}
        {isEditLike &&
        <button
          ref={addItemRef}
          className={`container-list-add-item rounded-4 ${dragging && dragging != "Container" ? "container-list-add-item-dragging" : ""} ${isDropTarget ? "container-list-add-item-hover" : ""}`}
          onClick={
            () => onAddItem(false, item.id + "%list", true)
          }
        >
          Add Item
        </button>}
      </div>}
    </div>
  )
};

export default Item;