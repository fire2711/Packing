import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faTrash } from '@fortawesome/free-solid-svg-icons';
import "../styles/item.css";
import { itemCategories } from '../app/routes/itemCategories';
import { useRef, useEffect } from 'react';

export default function({
  isContainer,
  item,
  setDraftItems,
}) {
  const nameInputRef = useRef(null);

  const changeItemCategory = (e) => {
    setDraftItems((prev) => prev.map((x) => (x._tmpId === item._tmpId ? { ...x, category: e.target.value } : x)));
  };

  const changeItemSize = (e) => {
    setDraftItems((prev) => prev.map((x) => (x._tmpId === item._tmpId ? { ...x, size: e.target.textContent.toLowerCase() } : x)));
  };

  const changeItemName = (e) => {
    setDraftItems((prev) => prev.map((x) => (x._tmpId === item._tmpId ? { ...x, name: e.target.value } : x)));
  };

  const deleteItem = () => {
    setDraftItems((prev) => prev.filter((x) => x._tmpId !== item._tmpId));
  };

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  return (
    <div className="item rounded-4" style={{backgroundColor: itemCategories[item.category].color}}>
      <FontAwesomeIcon className="item-grip" icon={faGripVertical} />  
      <FontAwesomeIcon className="item-delete" icon={faTrash} onClick={deleteItem} />
      <div className="item-content">
        <div className="item-label">
          <FontAwesomeIcon className="item-icon" icon={itemCategories[item.category].icon} />
          <input ref={nameInputRef} className="item-name" onChange={changeItemName} placeholder="Item Name" value={item.name}></input>
        </div>
        <div className="item-sizes">
          {["small", "medium", "large"].map(size => 
            <p
              key={`item-size-${size}`}
              className={`item-size ${size == item.size ? "item-size-selected" : ""}`}
              onClick={changeItemSize}
            >
                {size.toUpperCase()}
            </p>
          )}
        </div>
        <div className="item-category">
          <p className="item-category-label">Category: </p>
          <select className="item-category-select" value={item.category} onChange={changeItemCategory}>
            {Object.keys(itemCategories).filter(c => c != "Container").map(category =>
              <option key={`item-category-${category}`} value={category}>{category}</option>
            )}
          </select>
        </div>
      </div>
    </div>
  )
};