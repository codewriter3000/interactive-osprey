import { For } from "solid-js";

function MenuList({ menuItems, selectedMenuItem, isBeingClicked, setSelectedMenuItem, clickButton }: {
  menuItems: any[];
  selectedMenuItem: () => number;
  isBeingClicked: () => boolean;
  setSelectedMenuItem: (idx: number) => void;
  clickButton: (idx: number) => void;
}) {
  return (
    <div class="left-side">
      <div class="right-line"></div>
      <For each={menuItems}>
        {(item, index) => (
          <div
            style={`background-color: ${selectedMenuItem() === index() ? isBeingClicked() ? "#0b1301" : "#e6d318" : ""}; color: ${selectedMenuItem() === index() ? isBeingClicked() ? "#e6d318" : "#0b1301" : ""};`}
            class="menu-item"
          >
            <div>{item.name}</div>
            <div
              style={`background-color: ${selectedMenuItem() === index() ? item.color : ""} !important;`}
              class="square"
              onMouseEnter={() => {
                setSelectedMenuItem(index());
              }}
              onMouseLeave={() => {
                setSelectedMenuItem(-1);
              }}
              onClick={() => {
                clickButton(selectedMenuItem());
              }}
            />
          </div>
        )}
      </For>
    </div>
  );
}

export default MenuList;
