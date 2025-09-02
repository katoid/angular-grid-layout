import { Component, ElementRef, Inject, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import {
    KtdDragEnd, KtdDragStart, ktdGridCompact, KtdGridComponent, KtdGridItemComponent, KtdGridItemPlaceholder, KtdGridLayout, KtdGridLayoutItem,
    ktdGridSortLayoutItems, KtdResizeEnd, KtdResizeStart, ktdTrackById
} from '@katoid/angular-grid-layout';
import { ktdArrayRemoveItem } from '../utils';
import { DOCUMENT, NgClass, NgFor } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { KtdFooterComponent } from '../components/footer/footer.component';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { ktdGetOS } from './multi-item-handler.utils';
import { fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { ReactiveFormsModule } from '@angular/forms';

const realLifeLayout: KtdGridLayout = [
    {id: '0', x: 0, y: 0, w: 62, h: 3},
    {id: '1', x: 15, y: 5, w: 17, h: 4},
    {id: '2', x: 1, y: 11, w: 61, h: 1},
    {id: '3', x: 1, y: 12, w: 15, h: 1},
    {id: '4', x: 1, y: 13, w: 8, h: 3},
    {id: '5', x: 9, y: 13, w: 7, h: 3},
    {id: '6', x: 16, y: 12, w: 15, h: 1},
    {id: '7', x: 16, y: 13, w: 8, h: 3},
    {id: '8', x: 24, y: 13, w: 7, h: 3},
    {id: '9', x: 31, y: 12, w: 15, h: 1},
    {id: '10', x: 31, y: 13, w: 8, h: 3},
    {id: '11', x: 39, y: 13, w: 7, h: 3},
    {id: '12', x: 46, y: 12, w: 15, h: 1},
    {id: '13', x: 46, y: 17, w: 8, h: 3},
    {id: '14', x: 54, y: 13, w: 7, h: 3},
    {id: '15', x: 1, y: 16, w: 15, h: 1},
    {id: '16', x: 1, y: 17, w: 8, h: 3},
    {id: '17', x: 9, y: 17, w: 7, h: 3},
    {id: '18', x: 16, y: 16, w: 15, h: 1},
    {id: '19', x: 16, y: 17, w: 8, h: 3},
    {id: '20', x: 24, y: 17, w: 7, h: 3},
    {id: '21', x: 31, y: 16, w: 15, h: 1},
    {id: '22', x: 31, y: 17, w: 8, h: 3},
    {id: '23', x: 39, y: 17, w: 7, h: 3},
    {id: '24', x: 46, y: 16, w: 15, h: 1},
    {id: '25', x: 46, y: 13, w: 8, h: 3},
    {id: '26', x: 1, y: 21, w: 60, h: 1},
    {id: '27', x: 0, y: 9, w: 62, h: 1},
    {id: '28', x: 32, y: 5, w: 16, h: 4},
    {id: '29', x: 1, y: 22, w: 15, h: 1},
    {id: '30', x: 1, y: 23, w: 8, h: 3},
    {id: '31', x: 9, y: 23, w: 7, h: 3},
    {id: '32', x: 1, y: 31, w: 60, h: 1},
    {id: '33', x: 1, y: 41, w: 59, h: 1},
    {id: '34', x: 16, y: 22, w: 15, h: 1},
    {id: '35', x: 16, y: 23, w: 8, h: 3},
    {id: '36', x: 24, y: 23, w: 7, h: 3},
    {id: '37', x: 31, y: 32, w: 15, h: 1},
    {id: '38', x: 31, y: 23, w: 8, h: 3},
    {id: '39', x: 39, y: 23, w: 7, h: 3},
    {id: '40', x: 46, y: 22, w: 15, h: 1},
    {id: '41', x: 46, y: 23, w: 8, h: 3},
    {id: '42', x: 54, y: 23, w: 7, h: 3},
    {id: '43', x: 12, y: 49, w: 50, h: 8},
    {id: '44', x: 0, y: 50, w: 12, h: 2},
    {id: '45', x: 0, y: 52, w: 6, h: 4},
    {id: '46', x: 6, y: 52, w: 6, h: 4},
    {id: '47', x: 0, y: 49, w: 12, h: 1},
    {id: '48', x: 0, y: 48, w: 62, h: 1},
    {id: '49', x: 0, y: 98, w: 12, h: 2},
    {id: '50', x: 0, y: 100, w: 6, h: 4},
    {id: '51', x: 6, y: 100, w: 6, h: 4},
    {id: '52', x: 1, y: 26, w: 15, h: 1},
    {id: '53', x: 1, y: 27, w: 8, h: 3},
    {id: '54', x: 9, y: 27, w: 7, h: 3},
    {id: '55', x: 1, y: 32, w: 15, h: 1},
    {id: '56', x: 1, y: 36, w: 15, h: 1},
    {id: '57', x: 1, y: 33, w: 8, h: 3},
    {id: '58', x: 9, y: 33, w: 7, h: 3},
    {id: '59', x: 31, y: 33, w: 8, h: 3},
    {id: '60', x: 16, y: 32, w: 15, h: 1},
    {id: '61', x: 39, y: 33, w: 7, h: 3},
    {id: '62', x: 31, y: 22, w: 15, h: 1},
    {id: '63', x: 16, y: 33, w: 8, h: 3},
    {id: '64', x: 54, y: 33, w: 7, h: 3},
    {id: '65', x: 24, y: 33, w: 7, h: 3},
    {id: '66', x: 46, y: 33, w: 8, h: 3},
    {id: '67', x: 46, y: 32, w: 15, h: 1},
    {id: '68', x: 1, y: 37, w: 8, h: 3},
    {id: '69', x: 9, y: 37, w: 7, h: 3},
    {id: '70', x: 16, y: 36, w: 15, h: 1},
    {id: '71', x: 31, y: 36, w: 15, h: 1},
    {id: '72', x: 24, y: 37, w: 7, h: 3},
    {id: '73', x: 39, y: 37, w: 7, h: 3},
    {id: '74', x: 46, y: 36, w: 15, h: 1},
    {id: '75', x: 16, y: 37, w: 8, h: 3},
    {id: '76', x: 31, y: 37, w: 8, h: 3},
    {id: '77', x: 1, y: 42, w: 15, h: 1},
    {id: '78', x: 1, y: 43, w: 8, h: 3},
    {id: '79', x: 9, y: 43, w: 7, h: 3},
    {id: '80', x: 31, y: 42, w: 15, h: 1},
    {id: '81', x: 46, y: 42, w: 15, h: 1},
    {id: '82', x: 16, y: 42, w: 15, h: 1},
    {id: '83', x: 24, y: 43, w: 7, h: 3},
    {id: '84', x: 16, y: 43, w: 8, h: 3},
    {id: '85', x: 39, y: 43, w: 7, h: 3},
    {id: '86', x: 54, y: 43, w: 7, h: 3},
    {id: '87', x: 31, y: 43, w: 8, h: 3},
    {id: '88', x: 46, y: 43, w: 8, h: 3},
    {id: '89', x: 0, y: 56, w: 12, h: 2},
    {id: '90', x: 12, y: 57, w: 50, h: 8},
    {id: '91', x: 0, y: 60, w: 6, h: 4},
    {id: '92', x: 6, y: 60, w: 6, h: 4},
    {id: '93', x: 0, y: 58, w: 12, h: 2},
    {id: '94', x: 0, y: 66, w: 12, h: 2},
    {id: '95', x: 0, y: 68, w: 6, h: 4},
    {id: '96', x: 6, y: 68, w: 6, h: 4},
    {id: '97', x: 0, y: 74, w: 12, h: 2},
    {id: '98', x: 0, y: 76, w: 6, h: 4},
    {id: '99', x: 6, y: 76, w: 6, h: 4},
    {id: '100', x: 0, y: 82, w: 12, h: 2},
    {id: '101', x: 0, y: 84, w: 6, h: 4},
    {id: '102', x: 6, y: 84, w: 6, h: 4},
    {id: '103', x: 0, y: 90, w: 12, h: 2},
    {id: '104', x: 0, y: 92, w: 6, h: 4},
    {id: '105', x: 6, y: 92, w: 6, h: 4},
    {id: '106', x: 16, y: 26, w: 15, h: 1},
    {id: '107', x: 16, y: 27, w: 8, h: 3},
    {id: '108', x: 24, y: 27, w: 7, h: 3},
    {id: '109', x: 0, y: 80, w: 12, h: 2},
    {id: '110', x: 0, y: 72, w: 12, h: 2},
    {id: '111', x: 0, y: 88, w: 12, h: 2},
    {id: '112', x: 0, y: 64, w: 12, h: 2},
    {id: '113', x: 0, y: 96, w: 12, h: 2},
    {id: '114', x: 0, y: 104, w: 12, h: 2},
    {id: '115', x: 0, y: 106, w: 12, h: 2},
    {id: '116', x: 6, y: 108, w: 6, h: 4},
    {id: '117', x: 0, y: 108, w: 6, h: 4},
    {id: '118', x: 0, y: 112, w: 12, h: 2},
    {id: '119', x: 0, y: 120, w: 12, h: 2},
    {id: '120', x: 0, y: 128, w: 12, h: 2},
    {id: '121', x: 0, y: 144, w: 12, h: 2},
    {id: '122', x: 0, y: 114, w: 12, h: 2},
    {id: '123', x: 0, y: 116, w: 6, h: 4},
    {id: '124', x: 6, y: 116, w: 6, h: 4},
    {id: '125', x: 0, y: 122, w: 12, h: 2},
    {id: '126', x: 0, y: 130, w: 12, h: 2},
    {id: '127', x: 0, y: 124, w: 6, h: 4},
    {id: '128', x: 6, y: 124, w: 6, h: 4},
    {id: '129', x: 0, y: 132, w: 6, h: 4},
    {id: '130', x: 6, y: 132, w: 6, h: 4},
    {id: '131', x: 0, y: 136, w: 12, h: 2},
    {id: '132', x: 0, y: 138, w: 12, h: 2},
    {id: '133', x: 6, y: 140, w: 6, h: 4},
    {id: '134', x: 0, y: 140, w: 6, h: 4},
    {id: '135', x: 0, y: 146, w: 12, h: 2},
    {id: '136', x: 0, y: 148, w: 6, h: 4},
    {id: '137', x: 6, y: 148, w: 6, h: 4},
    {id: '138', x: 0, y: 154, w: 12, h: 2},
    {id: '139', x: 0, y: 156, w: 6, h: 4},
    {id: '140', x: 6, y: 156, w: 6, h: 4},
    {id: '141', x: 0, y: 170, w: 12, h: 2},
    {id: '142', x: 0, y: 164, w: 6, h: 4},
    {id: '143', x: 6, y: 164, w: 6, h: 4},
    {id: '144', x: 0, y: 160, w: 12, h: 2},
    {id: '145', x: 0, y: 152, w: 12, h: 2},
    {id: '146', x: 0, y: 162, w: 12, h: 2},
    {id: '147', x: 0, y: 168, w: 12, h: 2},
    {id: '148', x: 0, y: 176, w: 12, h: 2},
    {id: '149', x: 6, y: 172, w: 6, h: 4},
    {id: '150', x: 0, y: 172, w: 6, h: 4},
    {id: '151', x: 0, y: 186, w: 12, h: 2},
    {id: '152', x: 0, y: 210, w: 12, h: 2},
    {id: '153', x: 0, y: 212, w: 6, h: 4},
    {id: '154', x: 6, y: 212, w: 6, h: 4},
    {id: '155', x: 0, y: 218, w: 12, h: 2},
    {id: '156', x: 0, y: 220, w: 6, h: 4},
    {id: '157', x: 6, y: 220, w: 6, h: 4},
    {id: '158', x: 0, y: 226, w: 12, h: 2},
    {id: '159', x: 0, y: 228, w: 6, h: 4},
    {id: '160', x: 6, y: 228, w: 6, h: 4},
    {id: '161', x: 0, y: 234, w: 12, h: 2},
    {id: '162', x: 0, y: 236, w: 6, h: 4},
    {id: '163', x: 6, y: 236, w: 6, h: 4},
    {id: '164', x: 0, y: 178, w: 12, h: 2},
    {id: '165', x: 0, y: 184, w: 12, h: 2},
    {id: '166', x: 0, y: 194, w: 12, h: 2},
    {id: '167', x: 0, y: 192, w: 12, h: 2},
    {id: '168', x: 0, y: 196, w: 6, h: 4},
    {id: '169', x: 6, y: 196, w: 6, h: 4},
    {id: '170', x: 0, y: 200, w: 12, h: 2},
    {id: '171', x: 0, y: 202, w: 12, h: 2},
    {id: '172', x: 0, y: 208, w: 12, h: 2},
    {id: '173', x: 0, y: 232, w: 12, h: 2},
    {id: '174', x: 0, y: 224, w: 12, h: 2},
    {id: '175', x: 0, y: 216, w: 12, h: 2},
    {id: '176', x: 54, y: 17, w: 7, h: 3},
    {id: '177', x: 12, y: 65, w: 50, h: 8},
    {id: '178', x: 12, y: 73, w: 50, h: 8},
    {id: '179', x: 12, y: 81, w: 50, h: 8},
    {id: '180', x: 46, y: 37, w: 8, h: 3},
    {id: '181', x: 12, y: 89, w: 50, h: 8},
    {id: '182', x: 12, y: 97, w: 50, h: 8},
    {id: '183', x: 12, y: 105, w: 50, h: 8},
    {id: '184', x: 12, y: 113, w: 50, h: 8},
    {id: '185', x: 12, y: 121, w: 50, h: 8},
    {id: '186', x: 12, y: 129, w: 50, h: 8},
    {id: '187', x: 12, y: 137, w: 50, h: 8},
    {id: '188', x: 12, y: 145, w: 50, h: 8},
    {id: '189', x: 12, y: 153, w: 50, h: 8},
    {id: '190', x: 12, y: 161, w: 50, h: 8},
    {id: '191', x: 12, y: 169, w: 50, h: 8},
    {id: '192', x: 12, y: 177, w: 50, h: 8},
    {id: '193', x: 6, y: 180, w: 6, h: 4},
    {id: '194', x: 0, y: 180, w: 6, h: 4},
    {id: '195', x: 6, y: 188, w: 6, h: 4},
    {id: '196', x: 0, y: 188, w: 6, h: 4},
    {id: '197', x: 12, y: 185, w: 50, h: 8},
    {id: '198', x: 12, y: 193, w: 50, h: 8},
    {id: '199', x: 12, y: 209, w: 50, h: 8},
    {id: '200', x: 12, y: 201, w: 50, h: 8},
    {id: '201', x: 12, y: 217, w: 50, h: 8},
    {id: '202', x: 12, y: 225, w: 50, h: 8},
    {id: '203', x: 12, y: 233, w: 50, h: 8},
    {id: '204', x: 0, y: 30, w: 62, h: 1},
    {id: '205', x: 0, y: 46, w: 62, h: 2},
    {id: '206', x: 0, y: 20, w: 62, h: 1},
    {id: '207', x: 0, y: 40, w: 62, h: 1},
    {id: '208', x: 54, y: 37, w: 7, h: 3},
    {id: '209', x: 0, y: 10, w: 62, h: 1},
    {id: '210', x: 46, y: 26, w: 15, h: 1},
    {id: '211', x: 31, y: 26, w: 15, h: 1},
    {id: '212', x: 31, y: 27, w: 8, h: 3},
    {id: '213', x: 46, y: 27, w: 8, h: 3},
    {id: '214', x: 54, y: 27, w: 7, h: 3},
    {id: '215', x: 39, y: 27, w: 7, h: 3},
    {id: '216', x: 0, y: 3, w: 62, h: 2},
    {id: '217', x: 0, y: 204, w: 6, h: 4},
    {id: '218', x: 6, y: 204, w: 6, h: 4}
];
const realLifeLayoutSmall: KtdGridLayout = [
    {id: '2', x: 1, y: 0, w: 61, h: 1},
    {id: '3', x: 1, y: 1, w: 15, h: 1},
    {id: '4', x: 1, y: 2, w: 8, h: 3},
    {id: '5', x: 9, y: 2, w: 7, h: 3},
    {id: '6', x: 16, y: 1, w: 15, h: 1},
    {id: '7', x: 16, y: 2, w: 8, h: 3},
    {id: '8', x: 24, y: 2, w: 7, h: 3},
    {id: '9', x: 31, y: 1, w: 15, h: 1},
    {id: '10', x: 31, y: 2, w: 8, h: 3},
    {id: '11', x: 39, y: 2, w: 7, h: 3},
    {id: '12', x: 46, y: 1, w: 15, h: 1},
    {id: '13', x: 46, y: 6, w: 8, h: 3},
    {id: '14', x: 54, y: 2, w: 7, h: 3},
    {id: '15', x: 1, y: 5, w: 15, h: 1},
    {id: '16', x: 1, y: 6, w: 8, h: 3},
    {id: '17', x: 9, y: 6, w: 7, h: 3},
    {id: '18', x: 16, y: 5, w: 15, h: 1},
    {id: '19', x: 16, y: 6, w: 8, h: 3},
    {id: '20', x: 24, y: 6, w: 7, h: 3},
    {id: '21', x: 31, y: 5, w: 15, h: 1},
    {id: '22', x: 31, y: 6, w: 8, h: 3},
    {id: '23', x: 39, y: 6, w: 7, h: 3},
    {id: '24', x: 46, y: 5, w: 15, h: 1},
    {id: '25', x: 46, y: 2, w: 8, h: 3},
    {id: '32', x: 1, y: 9, w: 60, h: 1},
    {id: '39', x: 54, y: 6, w: 7, h: 3}
];

// Reproduce bug using default grid layout algorithm executed N times per selected item.
const multipleDragBugMutation = [
    {w: 8, h: 3, x: 2, y: 0, id: 'DRAG ME 1'},
    {w: 8, h: 3, x: 8, y: 3, id: 'DRAG ME 2'},
    {w: 15, h: 3, x: 16, y: 0, id: '6'},
    {w: 15, h: 1, x: 16, y: 3, id: '18'},
    {w: 8, h: 3, x: 16, y: 4, id: '19'},
    {w: 7, h: 3, x: 24, y: 4, id: '20'},
    {w: 60, h: 1, x: 1, y: 7, id: '32'}
];

const dragSoloItemUpBug: KtdGridLayout = [
    {id: '29', x: 31, y: 4, w: 15, h: 1},
    {id: '28', x: 39, y: 1, w: 7, h: 3},
    {id: '27', x: 31, y: 1, w: 8, h: 3},
    {id: '26', x: 1, y: 1, w: 10, h: 12},
    {id: '2', x: 1, y: 0, w: 61, h: 1},
    {id: '7', x: 18, y: 1, w: 8, h: 7},
    {id: '14', x: 54, y: 1, w: 7, h: 3},
    {id: '24', x: 46, y: 4, w: 15, h: 1},
    {id: '25', x: 46, y: 1, w: 8, h: 3}
];

// Reproduce bug with a break by previous item position instead of the moved one on compact function
const simpleMoveBugGridMutation = [
    {id: '0', x: 1, y: 0, w: 24, h: 1},
    {id: '1', x: 1, y: 1, w: 8, h: 1},
    {id: '2', x: 1, y: 2, w: 8, h: 3},
    {id: '3', x: 9, y: 2, w: 8, h: 8},
    {id: '4', x: 17, y: 1, w: 8, h: 2},
    {id: '5', x: 17, y: 3, w: 8, h: 3},
];

const multiItemSeparatedDragBug = [
    {id: '0', x: 1, y: 0, w: 38, h: 1},
    {id: '1', x: 1, y: 1, w: 15, h: 1},
    {id: '2', x: 1, y: 2, w: 15, h: 1},
    {id: '3', x: 16, y: 1, w: 8, h: 4},
    {id: '4', x: 24, y: 1, w: 7, h: 2},
    {id: '5', x: 16, y: 5, w: 8, h: 3},
    {id: '6', x: 24, y: 3, w: 15, h: 1}
]

@Component({
    standalone: true,
    selector: 'ktd-multi-item-handler',
    templateUrl: './multi-item-handler.component.html',
    styleUrls: ['./multi-item-handler.component.scss'],
    imports: [
        MatButtonModule,
        MatFormFieldModule,
        ReactiveFormsModule,
        MatSelectModule,
        MatOptionModule,
        MatInputModule,
        MatCheckboxModule,
        NgFor,
        NgClass,
        KtdGridComponent,
        KtdGridItemComponent,
        KtdFooterComponent
    ]
})
export class KtdMultiItemHandlerComponent implements OnInit, OnDestroy {
    @ViewChild(KtdGridComponent, {static: true}) grid: KtdGridComponent;
    trackById = ktdTrackById;

    cols = 62;
    rowHeight = 32;
    compactType: 'vertical' | 'horizontal' | null = 'vertical';
    preventCollision = false;
    selectedItems: string[] = [];
    copiedItems: number
    layout: KtdGridLayout = realLifeLayout;

    resizeSubscription: Subscription;

    private _isDraggingResizing: boolean = false;

    constructor(
        private ngZone: NgZone,
        public elementRef: ElementRef,
        @Inject(DOCUMENT) public document: Document
    ) {
        fromEvent<KeyboardEvent>(document, 'keydown').pipe(
            filter(event => {
                const isCtrlV = event.ctrlKey && event.key.toLowerCase() === 'v'; // Windows
                const isCmdV = event.metaKey && event.key.toLowerCase() === 'v'; // Mac
                return isCtrlV || isCmdV;
            })
        ).subscribe(() => {
            this.duplicateSelectedElements();
        });
    }

    ngOnInit() {
        this.resizeSubscription = merge(
            fromEvent(window, 'resize'),
            fromEvent(window, 'orientationchange')
        ).pipe(
            debounceTime(50),
        ).subscribe(() => {
            this.grid.resize();
        });
    }

    ngOnDestroy() {
        this.resizeSubscription.unsubscribe();
    }

    onDragStarted(event: KtdDragStart) {
        this._isDraggingResizing = true;
        console.log('onDragStarted', event);
    }

    onDragEnded(event: KtdDragEnd) {
        this._isDraggingResizing = false;
        console.log('onDragEnded', event);
    }

    onResizeStarted(event: KtdResizeStart) {
        this._isDraggingResizing = true;
        console.log('onResizeStarted', event);
    }

    onResizeEnded(event: KtdResizeEnd) {
        this._isDraggingResizing = false;
        console.log('onResizeEnded', event);
    }

    onCompactTypeChange(change: MatSelectChange) {
        console.log('onCompactTypeChange', change);
        this.compactType = change.value;
    }

    onPreventCollisionChange(checked: boolean) {
        console.log('onPreventCollisionChange', checked);
        this.preventCollision = checked;
    }

    onLayoutUpdated(layout: KtdGridLayout) {
        console.log('onLayoutUpdated', layout);
        this.layout = layout;
    }

    generateLayout() {
        const layout: KtdGridLayout = [];
        for (let i = 0; i < this.cols; i++) {
            const y = Math.ceil(Math.random() * 4) + 1;
            const width = 10;
            layout.push({
                x:
                    Math.round(Math.random() * Math.floor(this.cols / width - 1)) *
                    width,
                y: Math.floor(i / 6) * y,
                w: width,
                h: y,
                id: i.toString()
                // static: Math.random() < 0.05
            });
        }
        this.layout = ktdGridCompact(layout, this.compactType, this.cols);
        console.log('generateLayout', this.layout);
    }

    /** Adds a grid item to the layout */
    addItemToLayout(item?: KtdGridLayoutItem) {
        let newLayoutItem: KtdGridLayoutItem | undefined = item;
        if (!newLayoutItem) {


            const maxId = this.layout.reduce(
                (acc, cur) => Math.max(acc, parseInt(cur.id, 10)),
                -1
            );
            const nextId = maxId + 1;
            newLayoutItem = {
                id: nextId.toString(),
                x: -1,
                y: -1,
                w: 2,
                h: 2
            };
        }
        // Important: Don't mutate the array, create new instance. This way notifies the Grid component that the layout has changed.
        this.layout = [newLayoutItem, ...this.layout];
        this.layout = ktdGridCompact(this.layout, this.compactType, this.cols);
        console.log('addItemToLayout', newLayoutItem);
    }

    /**
     * Fired when a mousedown happens on the remove grid item button.
     * Stops the event from propagating an causing the drag to start.
     * We don't want to drag when mousedown is fired on remove icon button.
     */
    stopEventPropagation(event: Event) {
        event.preventDefault();
        event.stopPropagation();
    }

    /** Removes the item from the layout */
    removeItem(id: string) {
        this.selectedItems = [];
        // Important: Don't mutate the array. Let Angular know that the layout has changed creating a new reference.
        this.layout = ktdArrayRemoveItem(this.layout, item => item.id === id);
    }

    /**
     * Check if 'selectedItem' is on the multi item selection
     */
    isItemSelected(selectedItem: KtdGridLayoutItem): boolean {
        return this.selectedItems.includes(selectedItem.id);
    }

    /*
     * Select an item outside of the group
     */
    pointerDownItemSelection(
        event: MouseEvent,
        selectedItem: KtdGridLayoutItem
    ) {
        const ctrlOrCmd = ktdGetOS() == 'macos' ? event.metaKey : event.ctrlKey;
        if (!ctrlOrCmd) {
            const selectedItemExist = this.selectedItems.includes(
                selectedItem.id
            );
            if (!selectedItemExist) {
                // Click an element outside selection group
                // Clean all selections and select the new item
                if (event.button == 2) {
                    this.selectedItems = [];
                } else {
                    this.selectedItems = [selectedItem.id];
                }
            }
        }
    }

    /*
     * Select an item inside the group or multiselect with Control button
     */
    pointerUpItemSelection(event: MouseEvent, selectedItem: KtdGridLayoutItem) {
        const ctrlOrCmd = ktdGetOS() == 'macos' ? event.metaKey : event.ctrlKey;
        if (event.button !== 2) {
            //Only select with primary button click
            const selectedItemExist = this.selectedItems.includes(
                selectedItem.id
            );
            if (ctrlOrCmd) {
                if (selectedItemExist) {
                    // Control + click an element inside the selection group
                    if (!this._isDraggingResizing) {
                        // If not dragging, remove the selected item from the group
                        this.selectedItems = ktdArrayRemoveItem(
                            this.selectedItems,
                            itemId => itemId === selectedItem.id
                        );
                    }
                } else {
                    // Control + click an element outside the selection group
                    // Add the new selected item to the current group
                    this.selectedItems = [
                        ...this.selectedItems,
                        selectedItem.id
                    ];
                }
            } else if (!this._isDraggingResizing && selectedItemExist) {
                // Click an element inside the selection group
                this.selectedItems = [selectedItem.id];
            }
        }
    }

    /*
     * Paste a copy of "this.selectedItems" below the last selected item (preserving their positions)
     */
    private duplicateSelectedElements() {
        const maxId = this.layout.reduce(
            (acc, cur) => Math.max(acc, parseInt(cur.id, 10)),
            -1
        );
        let nextId = maxId;
        const lastY: number = this.selectedItems.length > 0 ? this.layout.find((l) => l.id === this.selectedItems[this.selectedItems.length - 1])!.y : 0;
        const layoutItemsSorted: KtdGridLayoutItem[] = ktdGridSortLayoutItems(this.selectedItems.map((gridItemId: string) => this.layout.find((l) => l.id === gridItemId)!), this.compactType);
        layoutItemsSorted.reverse().forEach((layoutItem) => {
            nextId++;
            const newLayoutItem = {
                id: nextId.toString(),
                w: layoutItem.w,
                h: layoutItem.h,
                x: layoutItem.x,
                y: lastY + 0.5
            };

            this.addItemToLayout(newLayoutItem);
        });
        console.log('duplicateSelectedElements', this.selectedItems)
    }

}
