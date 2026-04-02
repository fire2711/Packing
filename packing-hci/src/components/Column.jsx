import { useDroppable } from "@dnd-kit/react";
import { useEffect } from "react";
import Item from "./Item";
import { CollisionPriority } from "@dnd-kit/abstract";

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
  columnSizes,
  columnRef,
}) => {
  const {ref, isDropTarget} = useDroppable({
    id: side,
    accept: ["item", "container"],
    type: "column",
    collisionPriority: CollisionPriority.Lowest,
  });

  return (
    <div ref={ref} className={`col checklist ${dragging ? "checklist-dragging" : ""} checklist-${side}`}>
      <div ref={columnRef} className="checklist-items">
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
          />
        )}
      </div>
      {isEditLike && <div className={`row gx-0 checklist-buttons ${
        ((columnSizes.left == columnSizes.right && side == "left") || columnSizes[side] < columnSizes[side == "right" ? "left" : "right"]) ? "" : "checklist-buttons-hidden"
      }`}>
        <div className="col-6 pe-1 checklist-button">
          <button onClick={() => onAddItem(false, side)} className="col-12 btn btn-outline-primary btn-sm">Add Item</button>
        </div>
        <div className="col-6 ps-1 pe-0 checklist-button">
          <button onClick={() => onAddItem(true, side)} className="col-12 btn btn-outline-primary btn-sm">Add Container</button>
        </div>
      </div>}
    </div>
  )
}