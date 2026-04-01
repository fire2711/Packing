import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faTrash } from '@fortawesome/free-solid-svg-icons';
import "../styles/item.css";
import { itemCategories } from '../app/routes/itemCategories';
import { useRef, useEffect } from 'react';

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
}) => {
  const nameInputRef = useRef(null);
  const isContainer = item.category == "Container";

  const setActiveItems = (field, value) => {
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
    setActiveItems("category", e.target.value);
  };

  const changeItemSize = (e) => {
    setActiveItems("size", e.target.textContent.toLowerCase());
  };

  const changeItemName = (e) => {
    setActiveItems("name", e.target.value);
  };

  const deleteItem = () => {
    if (!item.draft) addDeletedItem(item);
    if (isContainer) listItems.forEach(listItem => !listItem.draft ? addDeletedItem(listItem) : null);
    if (isDraft) setDraftItems((prev) => prev.filter((x) => x._tmpId !== item._tmpId && x.container_id !== item.id));
    else setItems((prev) => prev.filter((x) => x.id !== item.id && x.container_id !== item.id));
  };

  useEffect(() => {
    if (isEditLike && focusOnNewItems) nameInputRef.current?.focus();
  }, []);

  return (
    <div className="item rounded-4">
      <div className="item-main" style={{backgroundColor: itemCategories[item.category].color}}>
        {isEditLike ? <FontAwesomeIcon className="item-grip" icon={faGripVertical} /> : <div className="item-grip" />}
        {isEditLike && <FontAwesomeIcon className="item-delete" icon={faTrash} onClick={deleteItem} />}
        <div className="item-content">
          <div className="item-label">
            <FontAwesomeIcon className="item-icon" icon={itemCategories[item.category].icon} />
            <input ref={nameInputRef} disabled={!isEditLike} className="item-name" onChange={changeItemName} placeholder={isContainer ? "Container Name" : "Item Name"} value={item.name}></input>
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
        {listItems.map(listItem => <Item
          item={listItem}
          setDraftItems={setDraftItems}
          isEditLike={isEditLike}
          key={isEditLike ? listItem._tmpId : listItem.id}
          isDraft={isDraft}
          setItems={setItems}
          addDeletedItem={addDeletedItem}
        />)}
        {isEditLike && <button className="container-list-add-item rounded-4" onClick={() => onAddItem(false, isDraft ? item._tmpId : item.id)}>
          Add Item
        </button>}
      </div>}
    </div>
  )
};

export default Item;