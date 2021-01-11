/**
 * Removes and item from an array. Returns a new array instance (it doesn't mutate the source array).
 * @param array source array to be returned without the element to remove
 * @param condition function that will return true for the item that we want to remove
 */
export function ktdArrayRemoveItem<T>(array: T[], condition: (item: T) => boolean) {
    const arrayCopy = [...array];
    const index = array.findIndex((item) => condition(item));
    if (index > -1) {
        arrayCopy.splice(index, 1);
    }
    return arrayCopy;
}
