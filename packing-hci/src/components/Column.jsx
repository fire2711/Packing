import { useDroppable } from "@dnd-kit/react";
import { useEffect, useState } from "react";
import Item from "./Item";
import { pointerIntersection, directionBiased } from "@dnd-kit/collision";

export const Column = ({
  children,
  items,
  side,
  setItems,
  onAddItem,
  isEditLike,
  isDraft,
  addDeletedItem,
  focusOnNewItems,
  dragging,
  hoverGroup,
  columnSizes,
  columnRef,
  suggestions,
  onItemPacked,
}) => {
  const [leftSuggestions, setLeftSuggestions] = useState([]);
  const [rightSuggestions, setRightSuggestions] = useState([]);

  const {ref, isDropTarget} = useDroppable({
    id: side,
    accept: "item",
    type: "column",
    collisionPriority: 1,
    collisionDetector: directionBiased,
  });

  // Splits suggestions into two columns of 5 items, prioritizing generated suggestions for the left column and learned suggestions for the right column
  useEffect(() => {
    const generated = suggestions?.generated;
    const learned = suggestions?.learned;

    if (!generated) return;
    if (generated.length < 6) {
      setLeftSuggestions([...generated.slice(0, generated.length), ...learned.slice(0, 6 - generated.length)]);
    } else {
      setLeftSuggestions(generated.slice(0, 6));
    }
    if (!learned) setRightSuggestions(generated.slice(6, 12));
    else {
      if (generated.length < 6) {
        setRightSuggestions(learned.slice(6 - generated.length, 12 - generated.length));
      } else {
        if (learned.length < 6) {
          setRightSuggestions([...generated.slice(6, 12 - learned.length), ...learned.slice(0, 6)]);
        } else {
          setRightSuggestions(learned.slice(0, 6));
        }
      }
    }
  }, [suggestions]);

  return (
    <div ref={ref} className={`col checklist ${dragging ? "checklist-dragging" : ""} checklist-${side}`}>
      <div ref={columnRef} className={`checklist-items ${dragging ? "checklist-items-dragging" : ""}`}>
        {children?.map((item, index) =>
          <Item
            key={item.id}
            item={item}
            setItems={setItems}
            listItems={item.category == "Container" ? items[item.id + "%list"] : []}
            onAddItem={onAddItem}
            isEditLike={isEditLike}
            isDraft={isDraft}
            addDeletedItem={addDeletedItem}
            focusOnNewItems={focusOnNewItems}
            index={index}
            group={side}
            dragging={dragging}
            hoverGroup={hoverGroup}
            onItemPacked={onItemPacked}
          />
        )}
      </div>
      {isEditLike && <div className="checklist-buttons">
        <div className={`row gx-0 checklist-add-buttons ${
          ((columnSizes.left == columnSizes.right && side == "left") || columnSizes[side] < columnSizes[side == "right" ? "left" : "right"]) ? "" : "checklist-add-buttons-hidden"
        }`}>
          <div className="col-6 pe-1">
            <button onClick={() => onAddItem(false, side)} className="col-12 btn btn-outline-primary btn-sm checklist-button">Add Item</button>
          </div>
          <div className="col-6 ps-1 pe-0">
            <button onClick={() => onAddItem(true, side)} className="col-12 btn btn-outline-primary btn-sm checklist-button">Add Container</button>
          </div>
        </div>
        {(side == "left" ? leftSuggestions : rightSuggestions).map(suggestion => <div key={suggestion.id} className="col-12">
          <button
            className="col-12 btn btn-outline-primary btn-sm checklist-button suggestion-button"
            onClick={
              () => onAddItem(suggestion.category == "Container", side, false, suggestion)
            }
          >
            <p className="m-0 ms-1 p-0 suggestion-icon">+</p>
            <p className="m-0 me-1 p-0">
              {suggestion.name} {suggestion.learned ? (
                <span className="ms-1 badge text-bg-light">Past trip</span>
              ) : null}</p>
          </button>
        </div>)}  
      </div>}
    </div>
  )
}