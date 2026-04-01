import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faTrash, faCheck } from '@fortawesome/free-solid-svg-icons';
import "../styles/item.css";
import { itemCategories } from '../app/routes/itemCategories';
import { useRef, useEffect, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { CollisionPriority } from "@dnd-kit/abstract";

const Item = ({
  item,
  setDraftItems,
  setItems,
  listItems,
  onAddItem,
  isEditLike,
  isDraft,
  addDeletedItem,
  focusOnNewItems,
  index,
  group,
}) => {
  const nameInputRef = useRef(null);
  const isContainer = item.category == "Container";
  const { ref, handleRef } = group == "column1" ? useSortable({
    id: `${isDraft ? item._tmpId : item.id}%${isContainer ? "container" : "item"}`,
    index: index,
    group: group,
    collisionPriority: group == "column1" ? CollisionPriority.Low : CollisionPriority.High,
  }): {ref: null, handleRef: null};
  const { ref: dropLocation, isDropTarget: dropOver } = useDroppable({id: isDraft ? item._tmpId + "%drop" : item.id + "%drop"});

  const setActiveItem = (field, value) => {
    if (isDraft) {
      setDraftItems(prev => prev.map(x => x._tmpId === item._tmpId ? (() => {
        x[field] = value;
        return x;
      })() : x));
    } else {
      setItems(prev => prev.map(x => x.id === item.id ? (() => {
        x[field] = value;
        return x;
      })() : x));
    }
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
    if (!item.draft) addDeletedItem(item);
    if (isContainer) listItems.forEach(listItem => !listItem.draft ? addDeletedItem(listItem) : null);
    if (isDraft) setDraftItems((prev) => prev.filter((x) => x._tmpId !== item._tmpId && x.container_id !== item._tmpId));
    else setItems((prev) => prev.filter((x) => x.id !== item.id && x.container_id !== item.id));
  };

  const onItemClick = () => {
    if (isContainer) {
      listItems.forEach(listItem => listItem.packed = !item.packed);
    }
    if (item.container_id && item.packed) {
      setItems(prev => prev.map(x => x.id == item.container_id ? {...x, packed: false} : x));
    }
    setActiveItem("packed", !item.packed);
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
            <input ref={nameInputRef} disabled={!isEditLike} style={!isEditLike ? {pointerEvents: "none"} : {}} className="item-name" onChange={changeItemName} placeholder={isContainer ? "Container Name" : "Item Name"} value={item.name}></input>
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
      {(isContainer && (isEditLike || listItems.length > 0)) && <div className="container-list">
        {listItems.sort((a, b) => a.index - b.index).map((listItem, i) => <Item
          item={listItem}
          setDraftItems={setDraftItems}
          isEditLike={isEditLike}
          key={`${isDraft ? listItem._tmpId : listItem.id}%item`}
          isDraft={isDraft}
          setItems={setItems}
          addDeletedItem={addDeletedItem}
          focusOnNewItems={focusOnNewItems}
          group={`list-for-${isDraft ? item._tmpId : item.id}`}
          index={i}
        />)}
        {isEditLike &&
        <button
          ref={dropLocation}
          className={
            `container-list-add-item rounded-4 ${
              dropOver ? "container-list-add-item-hover" : ""
            }`
          }
          onClick={
            () => onAddItem(false, isDraft ? item._tmpId : item.id)
          }
        >
          Add Item
        </button>}
      </div>}
    </div>
  )
};

export default Item;